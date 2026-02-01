import User from "../model/User.model.js"
import crypto from "crypto"
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const registerUser = async (req, res) => {
  //Get Data
  //Validate
  //check if user already exist
  //create a user in database
  //create a verification token
  //save token in database
  //send success status to user

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      })
    }

    const user = await User.create({
      name,
      email,
      password
    })

    console.log(user);

    if (!user) {
      return res.status(400).json({
        message: "User not registered!"
      });
    }

    const token = crypto.randomBytes(32).toString("hex")
    console.log(token);
    user.verificationToken = token

    await user.save()

    //send mail
    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      secure: false, // Use true for port 465, false for port 587
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.MAILTRAP_SENDEREMAIL,
      to: user.email,
      subject: "Verify your email.",
      text: `Please clik on the following link:
    ${process.env.BASE_URL}/api/v1/users/verify/${token}
      `, // Plain-text version of the message
    };

    await transporter.sendMail(mailOptions)

    res.status(201).json({
      message: "User registered successfully.",
      success: true
    })
  } catch (error) {
    res.status(400).json({
      message: "User not registered",
      error,
      success: false
    })
  }
};

const verifyUser = async (req, res) => {
  //get token form url
  //validate
  //find user based on token
  //if not
  //set isVerified field to true
  //remove verification token
  //save
  //return response

  const { token } = req.params
  console.log(token);
  if (!token) {
    return res.status(400).json({
      message: "Token not found"
    });
  }
  const user = await User.findOne({ verificationToken: token })

  if (!user) {
    return res.status(400).json({
      message: "User doesn't exist"
    });
  }

  user.isVerified = true
  user.verificationToken = undefined
  await user.save()

  return res.status(200).json({
    success: true,
    message: "Email verified successfully"
  });


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
