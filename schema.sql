/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE IF NOT EXISTS `warny` (
  `ID` int(10) NOT NULL AUTO_INCREMENT,
  `AbuserUserID` bigint(30) DEFAULT 0,
  `UserID` bigint(30) DEFAULT NULL,
  `UserName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `Reason` varchar(255) DEFAULT 'no reason specified',
  `WarnType` enum('kick','ban') DEFAULT NULL,
  `Date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`)