const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'notifications.json');

app.use(cors());
app.use(express.json());

const readData = () => {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
};

const writeData = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

app.get('/notifications', (req, res) => {
  res.status(200).json(readData());
});

app.post('/notifications', (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Invalid input' });
  
  const data = readData();
  const newNotification = { id: Date.now(), title, message, createdAt: new Date() };
  data.push(newNotification);
  writeData(data);
  res.status(201).json(newNotification);
});

app.put('/notifications/:id', (req, res) => {
  const { id } = req.params;
  const { title, message } = req.body;
  let data = readData();
  const index = data.findIndex(n => n.id == id);
  
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  data[index] = { ...data[index], title: title || data[index].title, message: message || data[index].message };
  writeData(data);
  res.status(200).json(data[index]);
});

app.delete('/notifications/:id', (req, res) => {
  const { id } = req.params;
  let data = readData();
  const filtered = data.filter(n => n.id != id);
  
  if (data.length === filtered.length) return res.status(404).json({ error: 'Not found' });
  
  writeData(filtered);
  res.status(204).send();
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));