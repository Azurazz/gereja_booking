const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Admin Dashboard
router.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        res.render('admin-login', { error: null });
    } else {
        // Ambil data booking dari database
        const query = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings GROUP BY blok_booking';
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching booking data:', err);
                res.status(500).send('Internal Server Error');
            } else {
                // Format data untuk memudahkan penggunaan di EJS
                const seatData = {
                    A: { max: 100, booked: 0 },
                    B: { max: 140, booked: 0 },
                    C: { max: 140, booked: 0 },
                    D: { max: 140, booked: 0 },
                    E: { max: 140, booked: 0 },
                    F: { max: 100, booked: 0 }
                };

                // Update jumlah seat yang sudah terbooking
                results.forEach(row => {
                    if (seatData[row.blok_booking]) {
                        seatData[row.blok_booking].booked = row.total_seat || 0;
                    }
                });

                // Ambil semua data bookings untuk tabel
                const bookingsQuery = 'SELECT * FROM bookings';
                db.query(bookingsQuery, (err, bookings) => {
                    if (err) {
                        console.error('Error fetching bookings:', err);
                        res.status(500).send('Internal Server Error');
                    } else {
                        // Render halaman admin-dashboard dengan data seat dan bookings
                        res.render('admin-dashboard', { seatData, bookings });
                    }
                });
            }
        });
    }
});

// Proses Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM admin WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            res.status(500).send('Internal Server Error');
        } else if (results.length > 0) {
            req.session.loggedIn = true;
            res.redirect('/admin');
        } else {
            res.render('admin-login', { error: 'Username atau password salah' });
        }
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin');
    });
});

// Middleware untuk parsing JSON
router.use(express.json());

// Update booking
router.post('/update-booking/:id', (req, res) => {
    const { id } = req.params;
    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;

    // Debugging: Cetak data yang diterima
    console.log('Data yang diterima:', { id, nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat });

    // Validasi: Pastikan ID ada dan valid
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    }

    // Buat query dinamis berdasarkan field yang dikirim
    let query = 'UPDATE bookings SET ';
    const values = [];
    if (nama !== undefined && nama.trim() !== '') { // Periksa apakah field ada dan tidak kosong
        query += 'nama = ?, ';
        values.push(nama);
    }
    if (distrik !== undefined && distrik.trim() !== '') {
        query += 'distrik = ?, ';
        values.push(distrik);
    }
    if (asal_sidang !== undefined && asal_sidang.trim() !== '') {
        query += 'asal_sidang = ?, ';
        values.push(asal_sidang);
    }
    if (blok_booking !== undefined && blok_booking.trim() !== '') {
        query += 'blok_booking = ?, ';
        values.push(blok_booking);
    }
    if (no_wa !== undefined && no_wa.trim() !== '') {
        query += 'no_wa = ?, ';
        values.push(no_wa);
    }
    if (jumlah_seat !== undefined && jumlah_seat.trim() !== '') {
        query += 'jumlah_seat = ?, ';
        values.push(jumlah_seat);
    }

    // Jika tidak ada field yang diupdate, kembalikan error
    if (values.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate.' });
    }

    // Hapus koma terakhir dan tambahkan WHERE clause
    query = query.slice(0, -2); // Hapus ", " terakhir
    query += ' WHERE id = ?';
    values.push(id);

    // Debugging: Cetak query dan values
    console.log('Query yang dijalankan:', query);
    console.log('Values:', values);

    // Jalankan query ke database
    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating booking:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengupdate data.' });
        }

        // Debugging: Cetak hasil query
        console.log('Hasil query:', result);

        // Periksa apakah data benar-benar terupdate
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil diupdate.' });
        } else {
            res.json({ success: false, message: 'Data tidak ditemukan atau tidak ada perubahan.' });
        }
    });
});

// Delete booking
router.delete('/delete-booking/:id', (req, res) => {
    const { id } = req.params;

    // Debugging: Cetak ID yang diterima
    console.log('ID yang diterima:', id);

    // Validasi: Pastikan ID ada dan valid
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    }

    const query = 'DELETE FROM bookings WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting booking:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus data.' });
        }

        // Debugging: Cetak hasil query
        console.log('Hasil query:', result);

        // Periksa apakah data benar-benar terhapus
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil dihapus.' });
        } else {
            res.json({ success: false, message: 'Data tidak ditemukan.' });
        }
    });
});

module.exports = router;
