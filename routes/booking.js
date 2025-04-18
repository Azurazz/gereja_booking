const express = require('express');
const util = require('util');
const db = require('../models/db');
// const puppeteer = require("puppeteer");
const pdf = require("html-pdf");
const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");

const router = express.Router();
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);
const query = util.promisify(db.query).bind(db);

const getSeatInfo = async (gedung = null, block_id = null) => {
    return new Promise((resolve, reject) => {
        let blockQuery = `
            SELECT
                blocks.id,
                blocks.block_name,
                blocks.gedung,
                blocks.seat_limit AS max,
                COALESCE(SUM(bookings.num_seats), 0) AS booked
            FROM blocks
            LEFT JOIN bookings ON bookings.block_id = blocks.id
        `;

        let params = [];

        if (gedung !== null) {
            blockQuery += ` WHERE blocks.gedung = ?`;
            params.push(gedung);

            blockQuery += ` GROUP BY blocks.id`;
        } else if (block_id !== null) {
            blockQuery += ` WHERE blocks.id = ?`;
            params.push(block_id);

            blockQuery += ` GROUP BY blocks.id FOR UPDATE`;
        }

        db.query(blockQuery, (params), (err, seatInfoResults) => {
            if (err) {
                console.error('Error fetching seat info:', err);
                return reject(err);
            }

            if (!seatInfoResults || seatInfoResults.length === 0) {
                console.error('No seat info data found.');
                return reject(new Error('No seat info data found.'));
            }

            resolve(seatInfoResults);
        });
    });
};

/**
 * VIEW ROUTES
 */
router.get('/hastina', async (req, res) => {
    try {
        const distrikQuery = 'SELECT * FROM distrik';
        const [seatData, distrikResults] = await Promise.all([
            getSeatInfo('Hastinapura'),
            new Promise((resolve, reject) => {
                db.query(distrikQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        res.render('bookings/hastina', { seatData, distrikList: distrikResults });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/yudistira', async (req, res) => {
    try {
        const distrikQuery = 'SELECT * FROM distrik';
        const [seatData, distrikResults] = await Promise.all([
            getSeatInfo('Yudistira'),
            new Promise((resolve, reject) => {
                db.query(distrikQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        res.render('bookings/yudistira', { seatData, distrikList: distrikResults });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/success/:bookingCode', async (req, res) => {
    try {
        const bookingCode = req.params.bookingCode;

        const bookingQuery = `
            SELECT *
            FROM bookings
            WHERE bookings.booking_code = ?
            ORDER BY bookings.id DESC
        `;
        let bookingList = await query(bookingQuery, [bookingCode]);

        const bookingDetailQuery = `
            SELECT * 
            FROM booking_details
            JOIN distrik ON distrik.id = booking_details.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = booking_details.sidang_jemaat_id
            JOIN blocks ON blocks.id = booking_details.block_id
            WHERE booking_details.booking_code = ?
            LIMIT 1
        `;
        let bookingDetail = await query(bookingDetailQuery, [bookingCode]);

        res.render('bookings/success', { data: {bookingDetail: bookingDetail[0], bookingList} });
    } catch (error) {
        console.error("Error parsing success data:", error);
        res.render('bookings/success', { data: null });
    }
});

/** 
 * AJAX ROUTES
 */
router.get('/asal-sidang/:distrikId', async (req, res) => {
    try {
        const distrikId = req.params.distrikId;
        const { gedung } = req.query;

        let queryJemaat = `
            SELECT * 
            FROM sidang_jemaat 
            WHERE id_distrik = ?
        `;

        let queryParams = [distrikId];

        if (gedung === 'Hastinapura') {
            queryJemaat += ` 
                AND id NOT IN (
                    SELECT sidang_jemaat_id 
                    FROM bookings 
                    WHERE block_id IN (
                        SELECT id 
                        FROM blocks 
                        WHERE gedung = ?
                    )
                )
            `;
            queryParams.push(gedung);
        }

        let jemaatList = await query(queryJemaat, queryParams);

        res.json(jemaatList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

router.get('/:bookingId', async (req, res) => {
    try {
        let bookingId = req.params.bookingId;
        let bookingQuery = `
            SELECT * 
            FROM bookings
            WHERE id = ?
            LIMIT 1
        `;
        let bookingList = await query(bookingQuery, [bookingId]);

        res.json(bookingList[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

router.post('/book', async (req, res) => {
    const reqBody = req.body;

    if (!reqBody || !reqBody.distrik_id || !reqBody.sidang_jemaat_id || !reqBody.block_id || !reqBody.num_seats) {
        return res.status(400).json({ success: false, message: 'Input tidak valid.' });
    }

    try {
        await beginTransaction();

        const seatData = await getSeatInfo(null, reqBody.block_id);

        if (!seatData || !seatData.length) {
            await rollback();
            return res.status(400).json({ success: false, message: 'Blok tidak ditemukan.' });
        }

        const totalBooked = parseInt(seatData[0].booked);
        const maxSeats = parseInt(seatData[0].max);

        if (totalBooked + parseInt(reqBody.num_seats) > maxSeats) {
            await rollback();
            return res.status(400).json({ success: false, message: 'Jumlah kursi sudah tidak mencukupi. Silakan pilih blok lain.' });
        }

        const distrikQuery = 'SELECT * FROM distrik WHERE id = ?';
        const sidangQuery = 'SELECT * FROM sidang_jemaat WHERE id = ?';
        const [distrikData, sidangData] = await Promise.all([
            new Promise((resolve, reject) => {
                db.query(distrikQuery, [reqBody.distrik_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(sidangQuery, [reqBody.sidang_jemaat_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        const bookingCodeQuery = 'SELECT MAX(id) AS max_id FROM booking_details';
        const result = await new Promise((resolve, reject) => {
            db.query(bookingCodeQuery, [], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const nextId = (result[0].max_id || 0) + 1;
        const booking_code = `BK-${distrikData[0].nama_distrik.toUpperCase()}-${nextId.toString().padStart(3, '0')}`;

        let savedData = {
            distrik_id: reqBody.distrik_id,
            distrik_name: distrikData[0].nama_distrik,
            sidang_jemaat_id: reqBody.sidang_jemaat_id,
            sidang_jemaat_name: sidangData[0].nama_sidang,
            block_id: reqBody.block_id,
            block_name: seatData[0].block_name,
            gedung: seatData[0].gedung,
            num_seats: reqBody.num_seats,
            booking_code: booking_code,
            bookings: []
        };

        if (reqBody.gedung === 'Hastinapura') {
            if (Array.isArray(reqBody.child_name)) {
                for (let i = 0; i < reqBody.child_name.length; i++) {
                    const insertChild = `
                        INSERT INTO bookings (name, class, age, category, num_seats, distrik_id, sidang_jemaat_id, block_id, booking_code)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const result = await new Promise((resolve, reject) => {
                        db.query(
                            insertChild,
                            [
                                reqBody.child_name[i],
                                reqBody.child_class[i] || null,
                                reqBody.child_age[i] || null,
                                'Anak',
                                1,
                                reqBody.distrik_id,
                                reqBody.sidang_jemaat_id,
                                reqBody.block_id,
                                booking_code
                            ],
                            (err, result) => {
                                if (err) return reject(err);
                                resolve(result);
                            }
                        );
                    });

                    savedData.bookings.push({
                        id: result.insertId,
                        name: reqBody.child_name[i],
                        class: reqBody.child_class[i] || null,
                        age: reqBody.child_age[i] || null,
                        whatsapp: null,
                        category: 'Anak',
                        num_seats: 1,
                        distrik_id: reqBody.distrik_id,
                        distrik_name: distrikData[0].nama_distrik,
                        sidang_jemaat_id: reqBody.sidang_jemaat_id,
                        sidang_jemaat_name: sidangData[0].nama_sidang,
                        block_id: reqBody.block_id,
                        block_name: seatData[0].block_name,
                        booking_code
                    });
                }
            } else {
                await rollback();
                return res.status(400).json({ success: false, message: 'child_name bukan array.' });
            }

            if (Array.isArray(reqBody.pendamping_name)) {
                for (let i = 0; i < reqBody.pendamping_name.length; i++) {
                    const insertPendamping = `
                        INSERT INTO bookings (name, whatsapp, category, num_seats, distrik_id, sidang_jemaat_id, block_id, booking_code)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
    
                    const result = await new Promise((resolve, reject) => {
                        db.query(
                            insertPendamping,
                            [
                                reqBody.pendamping_name[i],
                                reqBody.pendamping_whatsapp[i] || null,
                                'Pendamping',
                                1,
                                reqBody.distrik_id,
                                reqBody.sidang_jemaat_id,
                                reqBody.block_id,
                                booking_code
                            ],
                            (err, result) => {
                                if (err) {
                                    console.error("❌ Error insert pendamping:", err);
                                    return reject(err);
                                }
    
                                resolve(result);
                            }
                        );
                    });
    
                    savedData.bookings.push({
                        id: result.insertId,
                        name: reqBody.pendamping_name[i],
                        class: null,
                        age: null,
                        whatsapp: reqBody.pendamping_whatsapp[i] || null,
                        category: 'Pendamping',
                        num_seats: 1,
                        distrik_id: reqBody.distrik_id,
                        distrik_name: distrikData[0].nama_distrik,
                        sidang_jemaat_id: reqBody.sidang_jemaat_id,
                        sidang_jemaat_name: sidangData[0].nama_sidang,
                        block_id: reqBody.block_id,
                        block_name: seatData[0].block_name,
                        booking_code
                    });
                }
            } else {
                await rollback();
                return res.status(400).json({ success: false, message: 'pendamping_name bukan array.' });
            }
        } else if (reqBody.gedung === 'Yudistira') {
            if (reqBody.name) {
                const insertQuery = `
                    INSERT INTO bookings (name, whatsapp, category, num_seats, distrik_id, sidang_jemaat_id, block_id, booking_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const result = await new Promise((resolve, reject) => {
                    db.query(
                        insertQuery,
                        [
                            reqBody.name,
                            reqBody.whatsapp,
                            reqBody.category,
                            1,
                            reqBody.distrik_id,
                            reqBody.sidang_jemaat_id,
                            reqBody.block_id,
                            booking_code
                        ],
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    );
                });

                savedData.bookings.push({
                    id: result.insertId,
                    name: reqBody.name,
                    class: null,
                    age: null,
                    whatsapp: reqBody.whatsapp,
                    category: reqBody.category,
                    num_seats: 1,
                    distrik_id: reqBody.distrik_id,
                    distrik_name: distrikData[0].nama_distrik,
                    sidang_jemaat_id: reqBody.sidang_jemaat_id,
                    sidang_jemaat_name: sidangData[0].nama_sidang,
                    block_id: reqBody.block_id,
                    block_name: seatData[0].block_name,
                    booking_code
                });
            } else {
                await rollback();
                return res.status(400).json({ success: false, message: 'name tidak ditemukan.' });
            }
        }

        const protocol = req.protocol;
        const host = req.get("host");
        const pdfPath = await generatePDF(protocol, host, savedData, booking_code);

        const insertBookingDetails = `
            INSERT INTO booking_details (booking_code, distrik_id, sidang_jemaat_id, block_id, num_seats, filename)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
            db.query(
                insertBookingDetails,
                [
                    booking_code,
                    reqBody.distrik_id,
                    reqBody.sidang_jemaat_id,
                    reqBody.block_id,
                    reqBody.num_seats,
                    pdfPath
                ],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        await commit();
        res.json({ 
            success: true, 
            message: "Booking berhasil! Mohon tunggu sebentar.", 
            // data: { ...savedData, booking_code, pdfPath } 
            data: { booking_code, pdfPath }
        });
    } catch (error) {
        await rollback();
        console.error('❌ Error during booking process:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem. Silakan coba lagi.' });
    }
});

router.get("/download-booking-pdf/:bookingCode", async (req, res) => {
    try {
        const { bookingCode } = req.params;

        const bookingDetailQuery = `
            SELECT
                booking_code,
                filename
            FROM booking_details
            WHERE booking_details.booking_code = ?
            LIMIT 1
        `;
        let bookingDetail = await query(bookingDetailQuery, [bookingCode]);

        const filePath = path.join(__dirname, `../public/${bookingDetail[0].filename}`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File tidak ditemukan" });
        }

        res.download(filePath, `${bookingDetail[0].booking_code}.pdf`, (err) => {
            if (err) {
                console.error("Error saat mengirim file:", err);
                res.status(500).json({ message: "Gagal mengunduh file" });
            }
        });
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server" });
    }
});

// async function generatePDF(protocol, host, bookingData, bookingCode) {
//     try {
//         const templatePath = path.join(__dirname, "..", "views", "templates", "bukti-pemesanan-pdf.ejs");
//         const rootPath = path.resolve(__dirname, "..");
//         const storageDir = path.join(rootPath, "public", "storage", "pdf");
//         const relativePath = `storage/pdf/${bookingCode}.pdf`;
//         const outputPath = path.join(rootPath, "public", relativePath);

//         await fs.mkdir(storageDir, { recursive: true });

//         const template = await fs.readFile(templatePath, "utf-8");
//         const html = ejs.render(template, { protocol, host, booking: bookingData });

//         const browser = await puppeteer.launch({ headless: "new" });
//         const page = await browser.newPage();

//         let timeStamp = new Date().toLocaleString("id-ID", {
//             weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
//             hour: '2-digit', minute: '2-digit', second: '2-digit'
//         });
//         let timeZone = () => {
//             const offset = new Date().getTimezoneOffset();
//             if (offset === -420) return "WIB (UTC+7)";
//             if (offset === -480) return "WITA (UTC+8)";
//             if (offset === -540) return "WIT (UTC+9)";
//             return "Zona Waktu Tidak Diketahui";
//         }

//         await page.setContent(html, { waitUntil: "load" });

//         await page.pdf({
//             path: outputPath,
//             format: "A4",
//             printBackground: true,
//             displayHeaderFooter: true,
//             margin: { bottom: '60px' },
//             footerTemplate: `
//                 <div class="footer" style="font-size:10px; text-align:center; width:100%; color: #555; line-height: 1.4;">
//                     <p style="margin: 1px 0; line-height: 1;">Dokumen ini dibuat secara otomatis oleh sistem.</p>
//                     <p style="margin: 1px 0; line-height: 1;">Dibuat pada: ${timeStamp} ${timeZone()}</span></p>
//                 </div>
//             `
//         });

//         await browser.close();

//         return relativePath;
//     } catch (error) {
//         console.error("❌ Error generating PDF:", error);
//         throw new Error("Gagal membuat bukti pemesanan.");
//     }
// }

const generatePDF = async (protocol, host, bookingData, bookingCode) => {
    try {
        const templatePath = path.join(__dirname, "..", "views", "templates", "bukti-pemesanan-pdf.ejs");
        const rootPath = path.resolve(__dirname, "..");
        const storageDir = path.join(rootPath, "public", "storage", "pdf");
        const relativePath = `storage/pdf/${bookingCode}.pdf`;
        const outputPath = path.join(rootPath, "public", relativePath);

        await fs.mkdir(storageDir, { recursive: true });

        const template = await fs.readFile(templatePath, "utf-8");
        const html = ejs.render(template, { protocol, host, booking: bookingData });

        let timeStamp = new Date().toLocaleString("id-ID", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        let timeZone = () => {
            const offset = new Date().getTimezoneOffset();
            if (offset === -420) return "WIB (UTC+7)";
            if (offset === -480) return "WITA (UTC+8)";
            if (offset === -540) return "WIT (UTC+9)";
            return "Zona Waktu Tidak Diketahui";
        }

        return new Promise((resolve, reject) => {
            pdf.create(html, {
                format: "A4",
                border: "10mm",
                footer: {
                    height: "5mm",
                    contents: `
                        <div style="font-size:10px; text-align:center; width:100%; color: #555; line-height: 1.4;">
                            <p style="margin: 1px 0; line-height: 1;">Dokumen ini dibuat secara otomatis oleh sistem.</p>
                            <p style="margin: 1px 0; line-height: 1;">Dibuat pada: ${timeStamp} ${timeZone()}</p>
                        </div>
                    `
                }
            }).toFile(outputPath, (err, res) => {
                if (err) {
                    reject("Gagal membuat PDF");
                } else {
                    resolve(relativePath);
                }
            });
        });
    } catch (error) {
        console.error("❌ Error generating PDF:", error);
        throw new Error("Gagal membuat bukti pemesanan.");
    }
}

module.exports = router;
