const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking Gedung 1
router.get('/', (req, res) => {
    const distrikQuery = 'SELECT id, nama_distrik FROM distrik';
    
    const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings  where blok_booking = "Yudistira" GROUP BY blok_booking';

    db.query(bookingQuery, (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        const seatData = {
            Yudistira: { max: 200, booked: 0 }
        };

        bookingResults.forEach(row => {
            if (seatData[row.blok_booking]) {
                seatData[row.blok_booking].booked = row.total_seat || 0;
            }
        });

        db.query(distrikQuery, (err, distrikResults) => {
            if (err) {
                console.error('Error fetching distrik data:', err);
                return res.status(500).send('Internal Server Error');
            }

            res.render('booking_gedung_1', { seatData, distrikList: distrikResults });
        });
    });
});

// Proses Booking Gedung 1
router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, no_wa, jumlah_seat } = req.body;

    const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings  where blok_booking = "Yudistira" GROUP BY blok_booking';

    db.query(bookingQuery, (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        const seatData = {
            Yudistira: { max: 200, booked: 0 }
        };

        bookingResults.forEach(row => {
            if (seatData[row.blok_booking]) {
                seatData[row.blok_booking].booked = row.total_seat || 0;
            }
        });

        // jika jumlah seat yang di booking lebih dari seat yang tersedia
        if (seatData.Yudistira.booked + parseInt(jumlah_seat) > seatData.Yudistira.max) {
            return res.status(400).send('Jumlah seat yang di booking melebihi kapasitas');
        }
        
        const query = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [nama, distrik, asal_sidang, 'Yudistira', no_wa, jumlah_seat], (err, result) => {
            if (err) {
                console.error('Error during booking:', err);
                res.status(500).send('Internal Server Error');
            } else {
                res.redirect('/booking');
            }
        });

    });


});

module.exports = router;
