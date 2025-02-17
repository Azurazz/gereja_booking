const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const homeRoutes = require('./routes/home');
const bookingGedungHastinaRoutes = require('./routes/booking_gedung_hastina');
const bookingGedungYudistiraRoutes = require('./routes/booking_gedung_yudistira');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use('/', homeRoutes);
app.use('/booking_gedung_hastina', bookingGedungHastinaRoutes);
app.use('/booking_gedung_yudistira', bookingGedungYudistiraRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`app running at http://localhost:${PORT}`)
});