-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 04 Mar 2025 pada 05.01
-- Versi server: 10.4.28-MariaDB
-- Versi PHP: 8.3.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `booking_app`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `admin`
--

INSERT INTO `admin` (`id`, `username`, `password`) VALUES
(1, 'admin', '123qwe');

-- --------------------------------------------------------

--
-- Struktur dari tabel `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `distrik` int(11) DEFAULT NULL,
  `asal_sidang` varchar(255) NOT NULL,
  `blok_booking` varchar(10) NOT NULL,
  `no_wa` varchar(15) NOT NULL,
  `jumlah_seat` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `bookings`
--

INSERT INTO `bookings` (`id`, `nama`, `distrik`, `asal_sidang`, `blok_booking`, `no_wa`, `jumlah_seat`) VALUES
(27, 'budianto', 3, 'tanjung', 'F', '019230192830912', 2),
(28, 'feri', 4, 'Condet', 'A', '102983019283', 5),
(31, 'Rizfan Herlaya', 2, 'karsem', 'Yudistira', '019283019283', 149),
(32, 'Rizfan Herlaya', 1, 'karsem', 'B', '019283019283', 140),
(35, 'gotami', 2, 'Karang Duren ', 'E', '019283019283', 4),
(36, 'rewrqw', 2, 'Banjarwinangun ', 'Yudistira', '019283019283', 23);

-- --------------------------------------------------------

--
-- Struktur dari tabel `distrik`
--

CREATE TABLE `distrik` (
  `id` int(11) NOT NULL,
  `nama_distrik` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `distrik`
--

INSERT INTO `distrik` (`id`, `nama_distrik`) VALUES
(1, 'Yogyakarta'),
(2, 'Magelang'),
(3, 'Purwokerto'),
(4, 'Jakarta'),
(5, 'Bandar Lampung'),
(6, 'Palembang'),
(7, 'Medan'),
(8, 'Palangkaraya'),
(9, 'Jayapura');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sidang_jemaat`
--

CREATE TABLE `sidang_jemaat` (
  `id` int(11) NOT NULL,
  `nama_sidang` varchar(255) NOT NULL,
  `id_distrik` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `sidang_jemaat`
--

INSERT INTO `sidang_jemaat` (`id`, `nama_sidang`, `id_distrik`) VALUES
(1, 'Kebon Kelapa', 4),
(2, 'Kelapa Gading', 4),
(3, 'Kedoya Selatan', 4),
(4, 'Pinangranti', 4),
(5, 'Pondok Labu', 4),
(6, 'Kramatjati', 4),
(7, 'Semper Timur', 4),
(8, 'Cipayung', 4),
(9, 'Margahayu', 4),
(10, 'Cibatu', 4),
(11, 'Purwadana', 4),
(12, 'Jatimurni', 4),
(13, 'Pejuang', 4),
(14, 'Suka Asih', 4),
(15, 'Serpong', 4),
(16, 'Kadu Agung', 4),
(17, 'Ciparigi', 4),
(18, 'Depok', 4),
(19, 'Dungus Cariang', 4),
(20, 'Lingkar Selatan', 4),
(21, 'Kertajaya', 4),
(22, 'Sambangan', 1),
(23, 'Sidakarya', 1),
(24, 'Yosomulyo', 1),
(25, 'Mojolangu', 1),
(26, 'Petemon', 1),
(27, 'Kaliwungu', 1),
(28, 'Pesu', 1),
(29, 'Ngandong', 1),
(30, 'Cetan', 1),
(31, 'Jetak', 1),
(32, 'Giritontro', 1),
(33, 'Watusigar', 1),
(34, 'Klaten', 1),
(35, 'Wedomartani 1', 1),
(36, 'Wedomartani 2', 1),
(37, 'Triadi', 1),
(38, 'Pandowoharjo', 1),
(39, 'Argosari', 1),
(40, 'Sendangsari', 1),
(41, 'Sendangagung', 1),
(42, 'Kebonharjo', 1),
(43, 'Baciro', 1),
(44, 'Wukirsari / Nogosari', 1),
(45, 'Sidomulyo / Plemantung', 1),
(46, 'Ringinharjo', 1),
(47, 'Bangunjiwo', 1),
(48, 'Palihan', 1),
(49, 'Sumberwungu', 1),
(50, 'Triharjo', 1),
(51, 'Babakan ', 3),
(52, 'Empangsari', 3),
(53, 'Waringinsari ', 3),
(54, 'Cisumur ', 3),
(55, 'Cisuru', 3),
(56, 'Gintungreja ', 3),
(57, 'Gunungreja ', 3),
(58, 'Kamulyan ', 3),
(59, 'Kawunganten ', 3),
(60, 'Kunci ', 3),
(61, 'Patimuan', 3),
(62, 'Rejamulya ', 3),
(63, 'Ujungmanik ', 3),
(64, 'Adiraja', 3),
(65, 'Banjarpanepen ', 3),
(66, 'Ciwuni', 3),
(67, 'Grujugan ', 3),
(68, 'Karangkemiri ', 3),
(69, 'Karangrena ', 3),
(70, 'Karangsari ', 3),
(71, 'Karangtawang ', 3),
(72, 'Penggalang ', 3),
(73, 'Purwareja ', 3),
(74, 'Sidanegara ', 3),
(75, 'Tanjung ', 3),
(76, 'Tritih Kulon ', 3),
(77, 'Padukuhan Keraton ', 3),
(78, 'Pecangakan ', 3),
(79, 'Purwodadi ', 3),
(80, 'Sokawangi ', 3),
(81, 'Banjarwinangun ', 2),
(82, 'Banjurmukadan', 2),
(83, 'Banyumanis', 2),
(84, 'Bumireja', 2),
(85, 'Gombong ', 2),
(86, 'Kaleng', 2),
(87, 'Kali Putih ', 2),
(88, 'Karang Duren ', 2),
(89, 'Karanggadung ', 2),
(90, 'Karangsari ', 2),
(91, 'Kedungdowo ', 2),
(92, 'Kedungwinangun ', 2),
(93, 'Kemirirejo ', 2),
(94, 'Lajer', 2),
(95, 'Langenrejo ', 2),
(96, 'Losari ', 2),
(97, 'Panggung Lor ', 2),
(98, 'Pecekelan', 2),
(99, 'Pesuruhan', 2),
(100, 'Pringombo ', 2),
(101, 'Pucangan ', 2),
(102, 'Purwodadi', 2),
(103, 'Sekarteja ', 2),
(104, 'Sidorejo ', 2),
(105, 'Sitiadi ', 2),
(106, 'Tanggeran ', 2),
(106, 'Sidomulyo', 5),
(107, 'Metro', 5),
(108, 'Payung Mulya', 5),
(109, 'Mojokerto', 5),
(110, 'Bangun Sri', 5),
(111, 'Seputih Banyak', 5),
(112, 'Tanjung Mas', 5),
(113, 'Tanjung Jaya', 5),
(114, 'Tulung Melati', 5),
(115, 'Kalirejo', 5),
(116, 'Poncowarno', 5),
(117, 'Purwosari', 5),
(118, 'Sendang Mulyo', 5),
(119, 'Sinarsari', 5),
(120, 'Sri Purnomo', 5),
(121, 'Sukosari', 5),
(122, 'Panggung Rejo', 5),
(123, 'Ambarawa', 5),
(124, 'Bandar Lampung', 5),
(125, 'Dadirejo', 5),
(126, 'Lumbirejo', 5),
(127, 'Pujo Rahayu', 5),
(128, 'Sidomukti', 5),
(129, 'Air Kubang', 5),
(130, 'Pasir Sakti', 5),
(131, 'Gunung Pasir Jaya', 5),
(132, 'Manggerawan', 5),
(133, 'Mumbang Jaya', 5),
(134, 'Sri Bhawono', 5),
(135, 'Sri Kaluko', 5),
(136, 'Sumber Agung', 5),
(137, 'Wawasan', 5),
(138, '9 Ilir', 6),
(139, 'Sungai Lilin', 6),
(140, 'Tambak Sari', 6),
(141, 'Tulung Harapan', 6),
(142, 'Pangkal Pinang', 6),
(143, 'Tiban Baru', 6),
(144, 'Cahaya Mas', 6),
(145, 'Pelita Jaya', 6),
(146, 'Talang Baru', 6),
(147, 'Sei Semayang', 7),
(148, 'Laubarus Baru', 7),
(149, 'Sei Serdang', 7),
(150, 'Perdamean', 7),
(151, 'Negara Beringin', 7),
(152, 'Beliti', 7),
(153, 'Mekar Mulya', 7),
(154, 'Muara Kelingi', 7),
(155, 'Megang Sakti 3', 7),
(156, 'Sukakarya', 7),
(157, 'Tes Rejang Lebong', 7),
(158, 'Tanjung Terdana', 7),
(159, 'Karang Anyar', 7),
(160, 'Pamenang IV/B2', 7),
(161, 'Pamenang VI/A1', 7),
(162, 'Pamenang XI/E1', 7),
(163, 'Kuamang Kuning', 7),
(164, 'Libo Kandis', 7),
(165, 'Rantau Badak', 7),
(166, 'Sumbersari', 7),
(167, 'Trimanunggal', 7),
(168, 'Muara Sabak', 7),
(169, 'Talang Jerinjing', 7),
(170, 'Pospel Mengupeh', 7),
(171, 'Samboja 3', 8),
(172, 'Sei Raya', 8),
(173, 'Radak Baru', 8),
(174, 'Spandak', 8),
(175, 'Magalau', 8),
(176, 'Manunggul Baru', 8),
(177, 'Asam-Asam', 8),
(178, 'Banjar Baru', 8),
(179, 'Batulasung', 8),
(180, 'Karangliwar', 8),
(181, 'Tumbang Lapan', 8),
(182, 'Tumbang Samui', 8),
(183, 'Putat Durei', 8),
(184, 'Tapin Bini', 8),
(185, 'Bukit Tunggal', 8),
(186, 'Taduwale', 9),
(187, 'Tule', 9),
(188, 'Sambuara', 9),
(189, 'Lobbo', 9),
(190, 'Tikala Kumaraka', 9),
(191, 'Purwosari', 9),
(192, 'Santigi', 9),
(193, 'Basala', 9),
(194, 'Beringinjaya', 9),
(195, 'Daruba/Falila', 9),
(196, 'Tobelo', 9),
(197, 'Klamalu', 9),
(198, 'Sorido', 9),
(199, 'Hamadi', 9),
(200, 'Sentani', 9),
(201, 'Km.26 Sorong', 9),
(202, 'Remu Utara', 9),
(203, 'Sabar Miokre', 9),
(204, 'Pasirputih', 9),
(205, 'Samabusa', 9),
(206, 'Sowi', 9),
(207, 'Timika', 9),
(208, 'Waisai', 9),
(209, 'Warkimbon', 9),
(210, 'Wirmaker', 9),
(211, 'Wandos', 9),
(212, 'Pospel Arso 12', 9),
(213, 'Pospel Kabilol', 9);


--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_distrik` (`distrik`);

--
-- Indeks untuk tabel `distrik`
--
ALTER TABLE `distrik`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `sidang_jemaat`
--
ALTER TABLE `sidang_jemaat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_distrik` (`id_distrik`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT untuk tabel `distrik`
--
ALTER TABLE `distrik`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `sidang_jemaat`
--
ALTER TABLE `sidang_jemaat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_distrik` FOREIGN KEY (`distrik`) REFERENCES `distrik` (`id`);

--
-- Ketidakleluasaan untuk tabel `sidang_jemaat`
--
ALTER TABLE `sidang_jemaat`
  ADD CONSTRAINT `sidang_jemaat_ibfk_1` FOREIGN KEY (`id_distrik`) REFERENCES `distrik` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
