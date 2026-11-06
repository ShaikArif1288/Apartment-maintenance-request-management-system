CREATE DATABASE IF NOT EXISTS apartment_maintenance;
USE apartment_maintenance;

CREATE TABLE IF NOT EXISTS residents (
 resident_id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 flat_no VARCHAR(20) NOT NULL,
 phone VARCHAR(15),
 email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS staff (
 staff_id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 phone VARCHAR(15),
 specialization VARCHAR(50),
 email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
 request_id INT AUTO_INCREMENT PRIMARY KEY,
 resident_id INT NOT NULL,
 staff_id INT NULL,
 issue_type VARCHAR(50) NOT NULL,
 description TEXT,
 request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
 status VARCHAR(30) DEFAULT 'Pending',
 repair_cost DECIMAL(10,2) DEFAULT 0,
 FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE,
 FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Example records
INSERT INTO residents (name, flat_no, phone, email)
SELECT 'Arif', 'A-101', '9876543210', 'arif@example.com'
WHERE NOT EXISTS (SELECT 1 FROM residents WHERE flat_no='A-101');

INSERT INTO residents (name, flat_no, phone, email)
SELECT 'Priya', 'B-202', '9876543211', 'priya@example.com'
WHERE NOT EXISTS (SELECT 1 FROM residents WHERE flat_no='B-202');

INSERT INTO staff (name, phone, specialization, email)
SELECT 'Ramesh', '9876543212', 'Plumbing', 'ramesh@example.com'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email='ramesh@example.com');

INSERT INTO staff (name, phone, specialization, email)
SELECT 'Suresh', '9876543213', 'Electrical', 'suresh@example.com'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email='suresh@example.com');

INSERT INTO maintenance_requests (resident_id, staff_id, issue_type, description, status, repair_cost)
SELECT r.resident_id, s.staff_id, 'Plumbing', 'Kitchen sink is leaking.', 'Assigned', 0
FROM residents r JOIN staff s ON s.specialization='Plumbing'
WHERE r.flat_no='A-101'
AND NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE description='Kitchen sink is leaking.');
