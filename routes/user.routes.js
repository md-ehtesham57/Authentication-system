import express from "express";
import { registerUser } from "../controller/user.controller.js";
import { verifyUser } from "../controller/user.controller.js";
import { login } from "../controller/user.controller.js";
import { getMe } from "../controller/user.controller.js";
import { logoutUser } from "../controller/user.controller.js";
import { forgotPassword } from "../controller/user.controller.js";
import { resetPassword } from "../controller/user.controller.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

const router = express.Router()

router.post("/register", registerUser)
router.get("/verify/:token", verifyUser)
router.post("/login", login);
router.post("/me", isLoggedIn, getMe);
router.get("/logout", isLoggedIn, logoutUser)
export default router; 
