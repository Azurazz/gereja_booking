const express = require('express');
const router = express.Router();

// Halaman Home
router.get('/', (req, res) => {
    res.render('home'); // Tidak perlu mengirim seatData ke home.ejs
});

module.exports = router;