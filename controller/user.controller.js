import User from "../model/User.model.js"
import crypto from "crypto"
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registerSchema } from "../utils/validation.js";

const registerUser = async (req, res) => {
  try {
    // Validate input
    const { name, email, password } = registerSchema.parse(req.body);

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate token + expiry
    const token = crypto.randomBytes(32).toString("hex");

    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Prepare verification URL
    const verifyUrl = `${process.env.BASE_URL}/api/v1/users/verify/${token}`;

    // SEND RESPONSE FIRST (CRITICAL FIX)
    res.status(201).json({
      success: true,
      message: "User registered. Please verify your email.",
    });

    // Handle email ASYNC (non-blocking)
    setImmediate(async () => {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.MAILTRAP_HOST,
          port: process.env.MAILTRAP_PORT,
          secure: false,
          auth: {
            user: process.env.MAILTRAP_USERNAME,
            pass: process.env.MAILTRAP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.MAILTRAP_SENDEREMAIL,
          to: user.email,
          subject: "Verify your email",
          text: `Click the link:\n${verifyUrl}`,
        });

      } catch (emailError) {
        console.warn("Email failed, fallback:");
        console.log("Verification URL:", verifyUrl);
      }
    });

  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};


const verifyUser = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token missing",
      });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      message: "All fields are required "
    })

  }

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      })
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role },

      process.env.JWT_SECRET, {
      expiresIn: '24h'
    }

    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000
    }
    res.cookie("token", token, cookieOptions)

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      }
    })

  } catch (error) {

  }

}

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"

      })
    }

    res.status(200).json({
      success: true,
      user
    })
  } catch (error) {

  }
}

const logoutUser = async (req, res) => {
  try {
    res.cookie('token', '', {});
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {

  }
}

const forgotPassword = async (req, res) => {
  try {
    //get email
    //find user based on email
    //reset token + reset expiry => Date.now() + 10*60*1000 => user.save()
    //send mail => design url
  } catch (error) {

  }
}


const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Token and password are required"
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token"
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Reset password failed",
      error: error.message
    });
  }
};


export {
  registerUser,
  verifyUser,
  login,
  getMe,
  logoutUser,
  forgotPassword,
  resetPassword
};
