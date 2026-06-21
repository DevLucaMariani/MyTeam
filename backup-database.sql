/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.8-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: palestra
-- ------------------------------------------------------
-- Server version	11.8.8-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `palestra`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `palestra` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;

USE `palestra`;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) NOT NULL,
  `email` varchar(160) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `height_cm` decimal(5,1) DEFAULT NULL,
  `weight_kg` decimal(5,1) DEFAULT NULL,
  `goal` varchar(255) DEFAULT NULL,
  `subscription` varchar(80) DEFAULT NULL,
  `subscription_expiry` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `fee_amount` decimal(10,2) DEFAULT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 0,
  `paid_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES
(1,'Marco','Rossi','marco.rossi@example.com','3331112222','1992-04-15','M',178.0,82.5,'Ipertrofia e forza','Annuale','2026-12-31','Nessuna patologia nota.','2026-06-17 10:13:39',NULL,0,NULL),
(2,'Giulia','Bianchi','giulia.bianchi@example.com','3334445555','1996-09-02','F',165.0,60.0,'Dimagrimento e tonificazione','Trimestrale','2026-09-30','Preferisce allenamenti al mattino.','2026-06-17 10:13:39',NULL,0,NULL),
(3,'Luca','Ferrari','luca.ferrari@example.com',NULL,NULL,NULL,NULL,NULL,NULL,'Annuale',NULL,NULL,'2026-06-18 13:48:56',600.00,1,'2026-06-21'),
(4,'Sara','Conti','sara.conti@example.com','3387654321','1995-07-22','F',168.0,63.5,'Dimagrimento','Semestrale','2026-12-15','Predilige cardio e total body.','2026-06-18 13:48:56',300.00,0,NULL),
(5,'Andrea','Greco','andrea.greco@example.com','3331122334','1988-11-05','M',175.0,78.0,'Forza (powerlifting)','Annuale','2027-01-31','Focus su panca, squat e stacco.','2026-06-18 13:48:57',720.00,1,'2026-06-10'),
(6,'Elena','Ricci','elena.ricci@example.com','3475566778','1998-02-18','F',163.0,57.0,'Tonificazione','Trimestrale','2026-09-30','Principiante, attenzione alla tecnica.','2026-06-18 13:48:57',150.00,0,NULL),
(7,'Davide','Marino','davide.marino@example.com','3299988776','1992-09-30','M',178.0,90.0,'Ricomposizione corporea','Annuale','2027-06-30','Lavoro sedentario, disponibile la sera.','2026-06-18 13:48:57',600.00,1,'2026-06-15'),
(8,'Martina','Gallo','martina.gallo@example.com','3661239870','1993-05-14','F',170.0,60.0,'Preparazione gara fitness','Annuale','2027-05-31','Atleta avanzata, 5 sedute/settimana.','2026-06-18 13:48:57',900.00,0,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `exercise_catalog`
--

DROP TABLE IF EXISTS `exercise_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercise_catalog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `muscle_group` varchar(80) DEFAULT NULL,
  `default_series` int(11) DEFAULT NULL,
  `default_reps` longtext DEFAULT NULL,
  `default_intensity` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_catalog_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercise_catalog`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `exercise_catalog` WRITE;
/*!40000 ALTER TABLE `exercise_catalog` DISABLE KEYS */;
INSERT INTO `exercise_catalog` VALUES
(1,'Panca piana bilanciere','Petto',NULL,NULL,NULL),
(2,'Panca inclinata bilanciere','Petto',NULL,NULL,NULL),
(3,'Spinte manubri inclinata','Petto',NULL,NULL,NULL),
(4,'Croci ai cavi','Petto',NULL,NULL,NULL),
(5,'Croci manubri','Petto',NULL,NULL,NULL),
(6,'Dips alle parallele','Petto',NULL,NULL,NULL),
(7,'Chest press','Petto',NULL,NULL,NULL),
(8,'Trazioni alla sbarra','Dorso',NULL,NULL,NULL),
(9,'Lat machine avanti','Dorso',NULL,NULL,NULL),
(10,'Lat machine presa stretta','Dorso',NULL,NULL,NULL),
(11,'Rematore bilanciere','Dorso',NULL,NULL,NULL),
(12,'Rematore manubrio','Dorso',NULL,NULL,NULL),
(13,'Pulley basso','Dorso',NULL,NULL,NULL),
(14,'Stacco da terra','Dorso',NULL,NULL,NULL),
(15,'Military press','Spalle',NULL,NULL,NULL),
(16,'Lento avanti manubri','Spalle',NULL,NULL,NULL),
(17,'Alzate laterali','Spalle',NULL,NULL,NULL),
(18,'Alzate frontali','Spalle',NULL,NULL,NULL),
(19,'Alzate posteriori','Spalle',NULL,NULL,NULL),
(20,'Tirate al mento','Spalle',NULL,NULL,NULL),
(21,'Curl bilanciere','Bicipiti',NULL,NULL,NULL),
(22,'Curl manubri','Bicipiti',NULL,NULL,NULL),
(23,'Curl a martello','Bicipiti',NULL,NULL,NULL),
(24,'Curl ai cavi','Bicipiti',NULL,NULL,NULL),
(25,'Panca Scott','Bicipiti',NULL,NULL,NULL),
(26,'French press','Tricipiti',NULL,NULL,NULL),
(27,'Push down ai cavi','Tricipiti',NULL,NULL,NULL),
(28,'Estensioni sopra la testa','Tricipiti',NULL,NULL,NULL),
(29,'Dips tra panche','Tricipiti',NULL,NULL,NULL),
(30,'Squat bilanciere','Gambe',NULL,NULL,NULL),
(31,'Pressa 45','Gambe',NULL,NULL,NULL),
(32,'Affondi manubri','Gambe',NULL,NULL,NULL),
(33,'Leg extension','Gambe',NULL,NULL,NULL),
(34,'Leg curl','Gambe',NULL,NULL,NULL),
(35,'Stacco rumeno','Gambe',NULL,NULL,NULL),
(36,'Calf in piedi','Gambe',NULL,NULL,NULL),
(37,'Hip thrust','Gambe',NULL,NULL,NULL),
(38,'Crunch','Addome',NULL,NULL,NULL),
(39,'Plank','Addome',NULL,NULL,NULL),
(40,'Leg raise','Addome',NULL,NULL,NULL),
(41,'Russian twist','Addome',NULL,NULL,NULL),
(63,'Squat goblet',NULL,3,'[\"12\",\"12\",\"12\"]','[\"@7\",\"@7\",\"@7\"]'),
(69,'Spinte manubri',NULL,3,'[\"12\",\"12\",\"12\"]','[\"@7\",\"@7\",\"@7\"]'),
(71,'Cyclette',NULL,1,'[\"25 min\"]','[\"moderata\"]'),
(83,'Leg press',NULL,3,'[\"15\",\"12\",\"12\"]','[\"@6\",\"@6\",\"@6\"]'),
(85,'Lat machine',NULL,3,'[\"15\",\"12\",\"12\"]','[\"@6\",\"@6\",\"@6\"]'),
(87,'Affondi a corpo libero',NULL,3,'[\"12\",\"12\",\"12\"]','[\"@6\",\"@6\",\"@6\"]'),
(91,'Panca piana manubri',NULL,4,'[\"10\",\"10\",\"10\",\"8\"]','[\"@8\",\"@8\",\"@8\",\"@8\"]'),
(92,'Military press manubri',NULL,3,'[\"12\",\"10\",\"10\"]','[\"@8\",\"@8\",\"@8\"]'),
(98,'Face pull',NULL,3,'[\"15\",\"15\",\"15\"]','[\"@9\",\"@9\",\"@9\"]'),
(102,'Calf seduto',NULL,4,'[\"20\",\"20\",\"15\",\"15\"]','[\"@9\",\"@9\",\"@9\",\"@9\"]'),
(105,'Affondi bulgari',NULL,3,'[\"12\",\"12\",\"12\"]','[\"@8\",\"@8\",\"@8\"]'),
(113,'Posing',NULL,1,'[\"15 min\"]','[\"\"]'),
(146,'Squat',NULL,3,'[\"10\",\"10\",\"8\"]','[\"@7\",\"@7\",\"@8\"]');
/*!40000 ALTER TABLE `exercise_catalog` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `exercise_logs`
--

DROP TABLE IF EXISTS `exercise_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercise_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `exercise_id` int(11) NOT NULL,
  `week_number` int(11) NOT NULL,
  `series_index` int(11) NOT NULL DEFAULT 1,
  `actual_weight` varchar(40) DEFAULT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `logged_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_log` (`exercise_id`,`week_number`,`series_index`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `exercise_logs_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exercise_logs_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `plan_exercises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercise_logs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `exercise_logs` WRITE;
/*!40000 ALTER TABLE `exercise_logs` DISABLE KEYS */;
INSERT INTO `exercise_logs` VALUES
(50,6,44,1,1,'30 kg',1,'2026-06-18 13:54:54'),
(51,6,44,1,2,'32 kg',1,'2026-06-18 13:54:54'),
(52,6,44,1,3,'34 kg',1,'2026-06-18 13:54:54'),
(53,6,45,1,1,'36 kg',1,'2026-06-18 13:54:54'),
(54,6,45,1,2,'38 kg',1,'2026-06-18 13:54:54'),
(55,6,45,1,3,'40 kg',1,'2026-06-18 13:54:54'),
(56,6,46,1,1,'42 kg',1,'2026-06-18 13:54:54'),
(57,6,46,1,2,'44 kg',1,'2026-06-18 13:54:54'),
(58,6,46,1,3,'46 kg',1,'2026-06-18 13:54:54'),
(59,6,47,1,1,'48 kg',1,'2026-06-18 13:54:54'),
(60,6,47,1,2,'50 kg',1,'2026-06-18 13:54:54'),
(61,6,47,1,3,'52 kg',1,'2026-06-18 13:54:54'),
(62,6,48,1,1,'54 kg',1,'2026-06-18 13:54:54'),
(63,6,48,1,2,'56 kg',1,'2026-06-18 13:54:54'),
(64,6,48,1,3,'58 kg',1,'2026-06-18 13:54:54'),
(65,6,49,1,1,'60 kg',1,'2026-06-18 13:54:54'),
(66,7,55,1,1,'30 kg',1,'2026-06-18 13:54:54'),
(67,7,55,1,2,'32 kg',1,'2026-06-18 13:54:54'),
(68,7,55,1,3,'34 kg',1,'2026-06-18 13:54:54'),
(69,7,55,1,4,'36 kg',1,'2026-06-18 13:54:54'),
(70,7,55,1,5,'38 kg',1,'2026-06-18 13:54:54'),
(71,7,56,1,1,'40 kg',1,'2026-06-18 13:54:54'),
(72,7,56,1,2,'42 kg',1,'2026-06-18 13:54:54'),
(73,7,56,1,3,'44 kg',1,'2026-06-18 13:54:54'),
(74,7,56,1,4,'46 kg',1,'2026-06-18 13:54:54'),
(75,7,56,1,5,'48 kg',1,'2026-06-18 13:54:54'),
(76,7,57,1,1,'50 kg',1,'2026-06-18 13:54:54'),
(77,7,57,1,2,'52 kg',1,'2026-06-18 13:54:54'),
(78,7,57,1,3,'54 kg',1,'2026-06-18 13:54:54'),
(79,7,57,1,4,'56 kg',1,'2026-06-18 13:54:54'),
(80,7,57,1,5,'58 kg',1,'2026-06-18 13:54:54'),
(81,7,58,1,1,'60 kg',1,'2026-06-18 13:54:54'),
(82,7,58,1,2,'62 kg',1,'2026-06-18 13:54:54'),
(83,7,58,1,3,'64 kg',1,'2026-06-18 13:54:54'),
(84,7,58,1,4,'66 kg',1,'2026-06-18 13:54:54'),
(85,7,58,1,5,'68 kg',1,'2026-06-18 13:54:54'),
(86,7,59,1,1,'70 kg',1,'2026-06-18 13:54:54'),
(87,7,59,1,2,'72 kg',1,'2026-06-18 13:54:54'),
(88,7,59,1,3,'74 kg',1,'2026-06-18 13:54:54'),
(89,7,59,1,4,'76 kg',1,'2026-06-18 13:54:54'),
(90,7,59,1,5,'78 kg',1,'2026-06-18 13:54:54'),
(91,7,60,1,1,'80 kg',1,'2026-06-18 13:54:54'),
(92,7,61,1,1,'82 kg',1,'2026-06-18 13:54:54'),
(93,7,61,1,2,'84 kg',1,'2026-06-18 13:54:55'),
(94,7,61,1,3,'86 kg',1,'2026-06-18 13:54:55'),
(95,7,61,1,4,'88 kg',1,'2026-06-18 13:54:55'),
(96,7,61,1,5,'90 kg',1,'2026-06-18 13:54:55'),
(97,7,62,1,1,'92 kg',1,'2026-06-18 13:54:55'),
(98,7,62,1,2,'94 kg',1,'2026-06-18 13:54:55'),
(99,7,62,1,3,'96 kg',1,'2026-06-18 13:54:55'),
(100,7,62,1,4,'98 kg',1,'2026-06-18 13:54:55'),
(101,7,62,1,5,'100 kg',1,'2026-06-18 13:54:55'),
(102,7,63,1,1,'102 kg',1,'2026-06-18 13:54:55'),
(103,7,63,1,2,'104 kg',1,'2026-06-18 13:54:55'),
(104,7,63,1,3,'106 kg',1,'2026-06-18 13:54:55'),
(105,7,63,1,4,'108 kg',1,'2026-06-18 13:54:55'),
(106,7,63,1,5,'110 kg',1,'2026-06-18 13:54:55'),
(107,10,84,1,1,'30 kg',1,'2026-06-18 13:54:55'),
(108,10,84,1,2,'32 kg',1,'2026-06-18 13:54:55'),
(109,10,84,1,3,'34 kg',1,'2026-06-18 13:54:55'),
(110,10,84,1,4,'36 kg',1,'2026-06-18 13:54:55'),
(111,10,85,1,1,'38 kg',1,'2026-06-18 13:54:55'),
(112,10,85,1,2,'40 kg',1,'2026-06-18 13:54:55'),
(113,10,85,1,3,'42 kg',1,'2026-06-18 13:54:55'),
(114,10,85,1,4,'44 kg',1,'2026-06-18 13:54:55'),
(115,10,86,1,1,'46 kg',1,'2026-06-18 13:54:55'),
(116,10,86,1,2,'48 kg',1,'2026-06-18 13:54:55'),
(117,10,86,1,3,'50 kg',1,'2026-06-18 13:54:55'),
(118,10,87,1,1,'52 kg',1,'2026-06-18 13:54:55'),
(119,10,87,1,2,'54 kg',1,'2026-06-18 13:54:55'),
(120,10,87,1,3,'56 kg',1,'2026-06-18 13:54:55'),
(121,10,88,1,1,'58 kg',1,'2026-06-18 13:54:55'),
(122,10,88,1,2,'60 kg',1,'2026-06-18 13:54:55'),
(123,10,88,1,3,'62 kg',1,'2026-06-18 13:54:55'),
(124,10,88,1,4,'64 kg',1,'2026-06-18 13:54:55');
/*!40000 ALTER TABLE `exercise_logs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(40) NOT NULL DEFAULT 'weekly_update',
  `customer_id` int(11) DEFAULT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `week_number` int(11) DEFAULT NULL,
  `message` varchar(400) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `audience` varchar(20) NOT NULL DEFAULT 'admin',
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES
(1,'weekly_update',7,9,2,'Davide Marino ha inviato l\'aggiornamento della settimana 2 (0% completato) — Ricomposizione Corporea.',0,'2026-06-21 12:15:57','admin'),
(3,'new_plan',3,5,NULL,'È disponibile una nuova scheda per te: \"Ipertrofia Upper/Lower\". Buon allenamento!',0,'2026-06-21 12:25:10','client'),
(4,'new_plan',4,6,NULL,'È disponibile una nuova scheda per te: \"Dimagrimento Full Body\". Buon allenamento!',0,'2026-06-21 12:25:10','client');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `nutrition`
--

DROP TABLE IF EXISTS `nutrition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nutrition` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `day_type` enum('allenamento','riposo') NOT NULL,
  `calories` int(11) DEFAULT NULL,
  `protein_g` int(11) DEFAULT NULL,
  `carbs_g` int(11) DEFAULT NULL,
  `fat_g` int(11) DEFAULT NULL,
  `water_l` decimal(3,1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nutrition` (`plan_id`,`day_type`),
  CONSTRAINT `nutrition_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nutrition`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `nutrition` WRITE;
/*!40000 ALTER TABLE `nutrition` DISABLE KEYS */;
INSERT INTO `nutrition` VALUES
(3,1,'allenamento',2600,180,300,70,3.0),
(4,1,'riposo',2300,170,230,70,2.5),
(7,6,'allenamento',1800,120,160,55,2.5),
(8,6,'riposo',1650,120,130,50,2.5),
(9,7,'allenamento',3000,180,350,80,3.5),
(10,7,'riposo',2700,175,300,75,3.0),
(11,8,'allenamento',1900,110,200,60,2.5),
(12,8,'riposo',1800,110,180,55,2.5),
(13,9,'allenamento',2400,180,230,65,3.0),
(14,9,'riposo',2200,180,180,65,3.0),
(15,10,'allenamento',2100,160,200,55,3.5),
(16,10,'riposo',1900,160,150,55,3.0),
(19,5,'allenamento',2800,190,330,75,3.5),
(20,5,'riposo',2500,180,260,75,3.0);
/*!40000 ALTER TABLE `nutrition` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `plan_days`
--

DROP TABLE IF EXISTS `plan_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_days` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `name` varchar(120) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `plan_days_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_days`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `plan_days` WRITE;
/*!40000 ALTER TABLE `plan_days` DISABLE KEYS */;
INSERT INTO `plan_days` VALUES
(5,1,0,'Giorno A — Petto e Tricipiti'),
(6,1,1,'Giorno B — Dorso e Bicipiti'),
(7,1,2,'Giorno C — Gambe'),
(14,6,0,'Full Body A'),
(15,6,1,'Full Body B'),
(16,6,2,'Cardio + Core'),
(17,7,0,'Giorno A'),
(18,7,1,'Giorno B'),
(19,7,2,'Giorno C'),
(20,8,0,'Total Body A'),
(21,8,1,'Total Body B'),
(22,9,0,'Push'),
(23,9,1,'Pull'),
(24,9,2,'Legs'),
(25,10,0,'Glutei e Gambe'),
(26,10,1,'Spalle e Dorso'),
(27,10,2,'Posing e Core'),
(32,5,0,'Upper A - Spinta'),
(33,5,1,'Lower A'),
(34,5,2,'Upper B - Tirata'),
(35,5,3,'Lower B');
/*!40000 ALTER TABLE `plan_days` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `plan_exercises`
--

DROP TABLE IF EXISTS `plan_exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_exercises` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `day_id` int(11) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `name` varchar(160) NOT NULL,
  `num_series` int(11) NOT NULL DEFAULT 3,
  `suggested_weight` varchar(40) DEFAULT NULL,
  `rest` varchar(40) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `reps_scheme` longtext DEFAULT NULL,
  `intensity_scheme` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `day_id` (`day_id`),
  CONSTRAINT `plan_exercises_ibfk_1` FOREIGN KEY (`day_id`) REFERENCES `plan_days` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_exercises`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `plan_exercises` WRITE;
/*!40000 ALTER TABLE `plan_exercises` DISABLE KEYS */;
INSERT INTO `plan_exercises` VALUES
(14,5,0,'Esercizio',4,'60 kg','90\'\'','Schiena ben appoggiata','{\"default\":[\"10\",\"10\",\"8\",\"8\"],\"overrides\":{}}',NULL),
(15,5,1,'Spinte manubri inclinata',3,'22 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}',NULL),
(16,5,2,'Croci ai cavi',3,'12 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}',NULL),
(17,5,3,'French press',3,'25 kg','60\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}',NULL),
(18,6,0,'Trazioni alla sbarra',4,'corpo libero','90\'\'','Aiuto elastico se serve','{\"default\":[\"8\",\"6\",\"6\",\"6\"],\"overrides\":{}}',NULL),
(19,6,1,'Rematore bilanciere',4,'50 kg','90\'\'',NULL,'{\"default\":[\"10\",\"8\",\"8\",\"8\"],\"overrides\":{}}',NULL),
(20,6,2,'Lat machine presa stretta',3,'50 kg','60\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}',NULL),
(21,6,3,'Curl bilanciere',3,'25 kg','60\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}',NULL),
(22,7,0,'Squat bilanciere',4,'80 kg','120\'\'','Profondita controllata','{\"default\":[\"10\",\"8\",\"8\",\"6\"],\"overrides\":{}}',NULL),
(23,7,1,'Pressa 45',3,'160 kg','90\'\'',NULL,'{\"default\":[\"12\",\"12\",\"10\"],\"overrides\":{}}',NULL),
(24,7,2,'Leg curl',3,'40 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}',NULL),
(25,7,3,'Calf in piedi',4,'60 kg','45\'\'',NULL,'{\"default\":[\"20\",\"18\",\"15\",\"15\"],\"overrides\":{}}',NULL),
(44,14,0,'Squat goblet',3,'16 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(45,14,1,'Chest press',3,'25 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(46,14,2,'Lat machine avanti',3,'40 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(47,14,3,'Plank',3,NULL,'45\'\'',NULL,'{\"default\":[\"30s\",\"30s\",\"30s\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(48,15,0,'Affondi manubri',3,'10 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(49,15,1,'Rematore manubrio',3,'12 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(50,15,2,'Spinte manubri',3,'8 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@7\",\"@7\",\"@7\"],\"overrides\":{}}'),
(51,15,3,'Crunch',3,NULL,'45\'\'',NULL,'{\"default\":[\"20\",\"20\",\"20\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(52,16,0,'Cyclette',1,NULL,NULL,NULL,'{\"default\":[\"25 min\"],\"overrides\":{}}','{\"default\":[\"moderata\"],\"overrides\":{}}'),
(53,16,1,'Russian twist',3,NULL,'45\'\'',NULL,'{\"default\":[\"20\",\"20\",\"20\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(54,16,2,'Leg raise',3,NULL,'45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(55,17,0,'Squat bilanciere',5,'110 kg','180\'\'','Cintura sopra i 100 kg','{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(56,17,1,'Panca piana bilanciere',5,'85 kg','180\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(57,17,2,'Rematore bilanciere',5,'70 kg','120\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(58,18,0,'Squat bilanciere',5,'112 kg','180\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(59,18,1,'Military press',5,'50 kg','180\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(60,18,2,'Stacco da terra',1,'140 kg','240\'\'','Una serie pesante','{\"default\":[\"5\"],\"overrides\":{}}','{\"default\":[\"@8\"],\"overrides\":{}}'),
(61,19,0,'Squat bilanciere',5,'108 kg','180\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(62,19,1,'Panca piana bilanciere',5,'82 kg','180\'\'',NULL,'{\"default\":[\"5\",\"5\",\"5\",\"5\",\"5\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(63,19,2,'Trazioni alla sbarra',5,'corpo libero','120\'\'',NULL,'{\"default\":[\"6\",\"6\",\"6\",\"6\",\"6\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(64,20,0,'Leg press',3,'120 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(65,20,1,'Chest press',3,'20 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(66,20,2,'Lat machine',3,'35 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(67,20,3,'Plank',3,NULL,'45\'\'',NULL,'{\"default\":[\"20s\",\"20s\",\"20s\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(68,21,0,'Affondi a corpo libero',3,NULL,'60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(69,21,1,'Alzate laterali',3,'6 kg','45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(70,21,2,'Curl manubri',3,'8 kg','45\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@6\",\"@6\",\"@6\"],\"overrides\":{}}'),
(71,21,3,'Crunch',3,NULL,'45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(72,22,0,'Panca piana manubri',4,'28 kg','75\'\'',NULL,'{\"default\":[\"10\",\"10\",\"10\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(73,22,1,'Military press manubri',3,'18 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(74,22,2,'Croci ai cavi',3,'12 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(75,22,3,'Push down ai cavi',3,'25 kg','45\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(76,23,0,'Lat machine avanti',4,'55 kg','75\'\'',NULL,'{\"default\":[\"10\",\"10\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(77,23,1,'Pulley basso',3,'50 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(78,23,2,'Curl bilanciere',3,'25 kg','45\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(79,23,3,'Face pull',3,'15 kg','45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(80,24,0,'Squat bilanciere',4,'80 kg','90\'\'',NULL,'{\"default\":[\"10\",\"10\",\"8\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(81,24,1,'Stacco rumeno',3,'70 kg','90\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(82,24,2,'Leg extension',3,'45 kg','60\'\'',NULL,'{\"default\":[\"15\",\"15\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(83,24,3,'Calf seduto',4,'40 kg','45\'\'',NULL,'{\"default\":[\"20\",\"20\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(84,25,0,'Hip thrust',4,'80 kg','90\'\'','Pausa in alto 1s','{\"default\":[\"12\",\"10\",\"10\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(85,25,1,'Squat bilanciere',4,'70 kg','90\'\'',NULL,'{\"default\":[\"10\",\"10\",\"8\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(86,25,2,'Affondi bulgari',3,'14 kg','75\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(87,25,3,'Leg curl',3,'40 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(88,26,0,'Lento avanti manubri',4,'12 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(89,26,1,'Alzate laterali',4,'8 kg','45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(90,26,2,'Lat machine',3,'40 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(91,26,3,'Face pull',3,'12 kg','45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(92,27,0,'Plank',3,NULL,'60\'\'',NULL,'{\"default\":[\"45s\",\"45s\",\"45s\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(93,27,1,'Russian twist',3,NULL,'45\'\'',NULL,'{\"default\":[\"20\",\"20\",\"20\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}'),
(94,27,2,'Posing',1,NULL,'Prove di posa',NULL,'{\"default\":[\"15 min\"],\"overrides\":{}}','{\"default\":[\"\"],\"overrides\":{}}'),
(111,32,0,'Panca piana bilanciere',4,'70 kg','90\'\'','Controlla la discesa','{\"default\":[\"8\",\"8\",\"8\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(112,32,1,'Spinte manubri inclinata',3,'26 kg','75\'\'',NULL,'{\"default\":[\"10\",\"10\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(113,32,2,'Alzate laterali',3,'10 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(114,32,3,'French press',3,'25 kg','60\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(115,33,0,'Squat bilanciere',4,'90 kg','120\'\'',NULL,'{\"default\":[\"8\",\"8\",\"6\",\"6\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(116,33,1,'Pressa 45',3,'180 kg','90\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(117,33,2,'Leg curl',3,'45 kg','60\'\'',NULL,'{\"default\":[\"12\",\"12\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(118,33,3,'Calf in piedi',4,'70 kg','45\'\'',NULL,'{\"default\":[\"15\",\"15\",\"15\",\"15\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(119,34,0,'Trazioni alla sbarra',4,'corpo libero','90\'\'','Elastico se serve','{\"default\":[\"8\",\"8\",\"6\",\"6\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(120,34,1,'Rematore bilanciere',4,'60 kg','90\'\'',NULL,'{\"default\":[\"10\",\"10\",\"8\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(121,34,2,'Lat machine presa stretta',3,'55 kg','75\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(122,34,3,'Curl bilanciere',3,'30 kg','60\'\'',NULL,'{\"default\":[\"12\",\"10\",\"10\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(123,35,0,'Stacco rumeno',4,'100 kg','120\'\'',NULL,'{\"default\":[\"8\",\"8\",\"8\",\"8\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(124,35,1,'Affondi manubri',3,'20 kg','75\'\'',NULL,'{\"default\":[\"12\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@8\",\"@8\",\"@8\"],\"overrides\":{}}'),
(125,35,2,'Leg extension',3,'50 kg','60\'\'',NULL,'{\"default\":[\"15\",\"12\",\"12\"],\"overrides\":{}}','{\"default\":[\"@9\",\"@9\",\"@9\"],\"overrides\":{}}'),
(126,35,3,'Crunch',3,NULL,'45\'\'',NULL,'{\"default\":[\"20\",\"20\",\"20\"],\"overrides\":{}}','{\"default\":[\"\",\"\",\"\"],\"overrides\":{}}');
/*!40000 ALTER TABLE `plan_exercises` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `plan_versions`
--

DROP TABLE IF EXISTS `plan_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `version` int(11) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp(),
  `changed_by` varchar(80) DEFAULT 'amministratore',
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `plan_versions_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_versions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `plan_versions` WRITE;
/*!40000 ALTER TABLE `plan_versions` DISABLE KEYS */;
INSERT INTO `plan_versions` VALUES
(1,1,2,'2026-06-17 13:37:21','amministratore','Modifica scheda attiva'),
(2,5,2,'2026-06-21 11:59:52','amministratore','Modifica scheda attiva'),
(3,5,3,'2026-06-21 12:00:08','amministratore','Modifica scheda attiva');
/*!40000 ALTER TABLE `plan_versions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `name` varchar(160) NOT NULL,
  `duration_weeks` int(11) NOT NULL DEFAULT 8,
  `status` enum('bozza','attiva','archiviata') NOT NULL DEFAULT 'bozza',
  `version` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `plans_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES
(1,1,'Forza Base 8 settimane',8,'attiva',2,'2026-06-17 10:13:39','2026-06-21 12:02:33','2026-06-22','2026-08-17'),
(5,3,'Ipertrofia Upper/Lower',8,'attiva',3,'2026-06-18 13:54:53','2026-06-21 12:00:08','2026-06-22','2026-08-17'),
(6,4,'Dimagrimento Full Body',6,'attiva',1,'2026-06-18 13:54:54','2026-06-21 12:18:00','2026-06-22','2026-06-26'),
(7,5,'Forza 5x5',12,'attiva',1,'2026-06-18 13:54:54','2026-06-21 12:02:33','2026-06-22','2026-09-14'),
(8,6,'Tonificazione Base',4,'bozza',1,'2026-06-18 13:54:55','2026-06-21 12:02:33','2026-06-22','2026-07-20'),
(9,7,'Ricomposizione Corporea',8,'attiva',1,'2026-06-18 13:54:55','2026-06-21 12:02:33','2026-06-22','2026-08-17'),
(10,8,'Preparazione Gara',10,'attiva',1,'2026-06-18 13:54:55','2026-06-21 12:02:33','2026-06-22','2026-08-31');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `progress_photos`
--

DROP TABLE IF EXISTS `progress_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `progress_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `photo_type` enum('fronte','lato','retro','libera') NOT NULL,
  `image_data` longtext NOT NULL,
  `taken_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `progress_photos_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `progress_photos_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progress_photos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `progress_photos` WRITE;
/*!40000 ALTER TABLE `progress_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `progress_photos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `weekly_updates`
--

DROP TABLE IF EXISTS `weekly_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_updates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `week_number` int(11) NOT NULL,
  `exercises_done` int(11) NOT NULL DEFAULT 0,
  `total_exercises` int(11) NOT NULL DEFAULT 0,
  `percent_complete` int(11) NOT NULL DEFAULT 0,
  `note` varchar(500) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `weekly_updates_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `weekly_updates`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `weekly_updates` WRITE;
/*!40000 ALTER TABLE `weekly_updates` DISABLE KEYS */;
INSERT INTO `weekly_updates` VALUES
(1,1,1,5,41,12,'Prima settimana ok, buone sensazioni.','2026-06-17 10:13:39'),
(2,5,1,27,54,50,'Prima settimana completata, buone sensazioni.','2026-06-18 13:54:54'),
(3,6,1,16,31,52,'Prima settimana completata, buone sensazioni.','2026-06-18 13:54:54'),
(4,7,1,41,41,100,'Prima settimana completata, buone sensazioni.','2026-06-18 13:54:55'),
(5,9,2,0,40,0,'Settimana 2 ok','2026-06-21 12:15:57');
/*!40000 ALTER TABLE `weekly_updates` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-21 12:34:18
