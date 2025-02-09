-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 09, 2025 at 09:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

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
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `password`) VALUES
(1, 'admin', '123qwe');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `distrik` varchar(255) DEFAULT NULL,
  `asal_sidang` varchar(255) NOT NULL,
  `blok_booking` varchar(10) NOT NULL,
  `no_wa` varchar(15) NOT NULL,
  `jumlah_seat` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `nama`, `distrik`, `asal_sidang`, `blok_booking`, `no_wa`, `jumlah_seat`) VALUES
(1, 'John Doe', NULL, 'Sidang A', 'A', '08123456', 2),
(2, 'Jane Smith', NULL, 'Sidang B', 'B', '08765432', 3),
(3, 'Alice Wong', NULL, 'Sidang C', 'C', '08987654', 4),
(4, 'Bob Lee', NULL, 'Sidang D', 'D', '08112233', 5),
(5, 'Charlie Kim', NULL, 'Sidang E', 'E', '08223344', 6),
(10, 'yadu', NULL, 'pwt', 'F', '01928301928', 5),
(11, 'Abdul', NULL, 'Purwokerto', 'B', '102938019823', 1),
(12, 'Yanuar', NULL, 'Purwokerto', 'Gedung 1', '012983109283098', 10),
(15, 'Mauleb', NULL, 'Magelang', 'A', '01928309128', 1),
(16, 'kacing', NULL, 'Purwokerto', 'F', '1882829292', 1),
(17, 'sudiantos', NULL, 'Purwokerto', 'Gedung 1', '02918309128', 1),
(19, 'namanama', NULL, 'alskd', 'Gedung 1', '01928309', 1),
(20, 'testhariinis', NULL, 'Jakarta', 'F', '1893939292', 1),
(21, 'testgedung1', NULL, 'Purwokerto', 'Gedung 1', '18828282', 1),
(22, 'kacing', 'Bogorst', 'Yogyakarta', 'F', '10283091238', 1),
(23, 'faros majenang', 'majenang', 'Purwokerto', 'B', '12345678', 1),
(24, 'test1235678', 'kkkkkk', 'kkkkkk', 'B', '10293810293', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
