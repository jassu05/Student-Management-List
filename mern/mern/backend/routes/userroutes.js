import express from "express";
import User from "../models/user.js";

const router = express.Router();

function sendUserError(res, err) {
  if (err.code === 11000) {
    return res.status(409).json({ error: "A student with this email address already exists." });
  }
  return res.status(400).json({ error: err.message });
}

router.post("/", async (req, res) => {
  const { name, email, course, age } = req.body;
  try {
    const user = await User.create({ name, email, course, age });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      try {
        const user = await User.findOneAndUpdate(
          { email },
          { name, course, age },
          { new: true, runValidators: true }
        );
        if (user) return res.json(user);
      } catch (updateError) {
        return sendUserError(res, updateError);
      }
    }
    sendUserError(res, err);
  }
});


router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { name, email, course, age } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, course, age },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    sendUserError(res, err);
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
