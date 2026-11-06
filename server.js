require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (req, res) => {
  try { await db.query("SELECT 1"); res.json({ message: "Server and database connected." }); }
  catch (e) { res.status(500).json({ error: "Database connection failed. Check .env and MySQL." }); }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const [[r]] = await db.query("SELECT COUNT(*) total FROM residents");
    const [[s]] = await db.query("SELECT COUNT(*) total FROM staff");
    const [[q]] = await db.query("SELECT COUNT(*) total FROM maintenance_requests");
    const [[p]] = await db.query("SELECT COUNT(*) total FROM maintenance_requests WHERE status <> 'Completed'");
    res.json({ residents:r.total, staff:s.total, requests:q.total, pending:p.total });
  } catch(e) { res.status(500).json({error:"Could not load dashboard."}); }
});

// Generic CRUD route helper for residents and staff
function crudRoutes(table, idField, fields, requiredFields) {
  app.get(`/api/${table}`, async (req,res) => {
    try { const [rows] = await db.query(`SELECT * FROM ${table} ORDER BY ${idField} DESC`); res.json(rows); }
    catch(e) { res.status(500).json({error:`Could not fetch ${table}.`}); }
  });
  app.post(`/api/${table}`, async (req,res) => {
    for (const f of requiredFields) if (!req.body[f]) return res.status(400).json({error:`${f} is required.`});
    const vals = fields.map(f => req.body[f] || null);
    try {
      const [result] = await db.query(`INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(()=>"?").join(",")})`, vals);
      res.status(201).json({message:"Record added.", id:result.insertId});
    } catch(e) { res.status(500).json({error:`Could not add record. Check input values.`}); }
  });
  app.put(`/api/${table}/:id`, async (req,res) => {
    for (const f of requiredFields) if (!req.body[f]) return res.status(400).json({error:`${f} is required.`});
    const vals = fields.map(f => req.body[f] || null);
    try {
      const [result] = await db.query(`UPDATE ${table} SET ${fields.map(f=>`${f}=?`).join(",")} WHERE ${idField}=?`, [...vals, req.params.id]);
      if (!result.affectedRows) return res.status(404).json({error:"Record not found."});
      res.json({message:"Record updated."});
    } catch(e) { res.status(500).json({error:"Could not update record."}); }
  });
  app.delete(`/api/${table}/:id`, async (req,res) => {
    try {
      const [result] = await db.query(`DELETE FROM ${table} WHERE ${idField}=?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({error:"Record not found."});
      res.json({message:"Record deleted."});
    } catch(e) { res.status(500).json({error:"Could not delete record."}); }
  });
}
crudRoutes("residents", "resident_id", ["name","flat_no","phone","email"], ["name","flat_no"]);
crudRoutes("staff", "staff_id", ["name","phone","specialization","email"], ["name"]);

app.get("/api/requests", async (req,res) => {
  try {
    const [rows] = await db.query(`SELECT m.*, r.name resident_name, r.flat_no, s.name staff_name
      FROM maintenance_requests m JOIN residents r ON m.resident_id=r.resident_id
      LEFT JOIN staff s ON m.staff_id=s.staff_id ORDER BY m.request_date DESC, m.request_id DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({error:"Could not fetch requests."}); }
});
app.post("/api/requests", async (req,res) => {
  const {resident_id,staff_id,issue_type,description,status,repair_cost}=req.body;
  if (!resident_id || !issue_type) return res.status(400).json({error:"Resident and issue type are required."});
  try {
    const [r] = await db.query(`INSERT INTO maintenance_requests
      (resident_id,staff_id,issue_type,description,status,repair_cost) VALUES (?,?,?,?,?,?)`,
      [resident_id,staff_id||null,issue_type,description||null,status||"Pending",Number(repair_cost)||0]);
    res.status(201).json({message:"Request created.",id:r.insertId});
  } catch(e) { res.status(500).json({error:"Could not create request. Verify resident/staff selection."}); }
});
app.put("/api/requests/:id", async (req,res) => {
  const {resident_id,staff_id,issue_type,description,status,repair_cost}=req.body;
  if (!resident_id || !issue_type || !status) return res.status(400).json({error:"Resident, issue, and status are required."});
  try {
    const [r] = await db.query(`UPDATE maintenance_requests SET resident_id=?,staff_id=?,issue_type=?,description=?,status=?,repair_cost=? WHERE request_id=?`,
      [resident_id,staff_id||null,issue_type,description||null,status,Number(repair_cost)||0,req.params.id]);
    if (!r.affectedRows) return res.status(404).json({error:"Request not found."});
    res.json({message:"Request updated."});
  } catch(e) { res.status(500).json({error:"Could not update request."}); }
});
app.delete("/api/requests/:id", async (req,res) => {
  try {
    const [r] = await db.query("DELETE FROM maintenance_requests WHERE request_id=?", [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({error:"Request not found."});
    res.json({message:"Request deleted."});
  } catch(e) { res.status(500).json({error:"Could not delete request."}); }
});

app.get("/", (req,res) => res.sendFile(path.join(__dirname,"..","public","index.html")));
app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
