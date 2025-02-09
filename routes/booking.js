const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking
router.get('/', (req, res) => {
    const querySeat = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings GROUP BY blok_booking';
    const queryDistrik = 'SELECT id, nama_distrik FROM distrik ORDER BY id ASC';

    db.query(querySeat, (errSeat, resultsSeat) => {
        if (errSeat) {
            console.error('Error fetching booking data:', errSeat);
            return res.status(500).send('Internal Server Error');
        }

        db.query(queryDistrik, (errDistrik, resultsDistrik) => {
            if (errDistrik) {
                console.error('Error fetching distrik data:', errDistrik);
                return res.status(500).send('Internal Server Error');
            }

            const seatData = {
                A: { max: 100, booked: 0 },
                B: { max: 140, booked: 0 },
                C: { max: 140, booked: 0 },
                D: { max: 140, booked: 0 },
                E: { max: 140, booked: 0 },
                F: { max: 100, booked: 0 }
            };

            resultsSeat.forEach(row => {
                if (seatData[row.blok_booking]) {
                    seatData[row.blok_booking].booked = row.total_seat || 0;
                }
            });

            res.render('booking', { seatData, distrikList: resultsDistrik });
        });
    });
});


// Proses Booking
router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;
    const query = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat], (err, result) => {
        if (err) {
            console.error('Error during booking:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/booking');
        }
    });
});

module.exports = router;