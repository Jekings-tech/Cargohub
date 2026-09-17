const User = require('../models/User');

// PUT /api/users/profile
// Body: { username?, currentPassword?, newPassword? }
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, currentPassword, newPassword } = req.body;

    // Change username if provided and different
    if (username && username.trim() !== user.username) {
      const exists = await User.findOne({ username: username.trim() });
      if (exists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username.trim();
    }

    // Change password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: 'Current password required to change password' });
      }
      const ok = await user.matchPassword(currentPassword);
      if (!ok) {
        return res.status(401).json({ message: 'Current password is wrong' });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: 'New password must be 6+ characters' });
      }
      user.password = newPassword; // pre-save hook hashes it
    }

    await user.save();

    res.json({
      message: 'Profile updated',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};