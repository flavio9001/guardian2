const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { createCanvas } = require('canvas');

app.use(bodyParser.json());

let users = [];

app.post('/api/users', (req, res) => {
  const user = { ...req.body, id: Date.now() };
  users.push(user);
  res.status(201).json(user);
});

app.put('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id == req.params.id);
  if (index !== -1) {
    const { password, ...updateData } = req.body;
    users[index] = { ...users[index], ...updateData };
    if (password && password.trim() !== '') {
      users[index].password = password;
    }
    res.json(users[index]);
  } else {
    res.status(404).send('User not found');
  }
});

app.get('/api/org-chart', (req, res) => {
  const canvas = createCanvas(481, 340); 
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 481, 340);
  
  const vips = users.filter(u => u.role === 'VIP');
  vips.forEach((vip, i) => {
    ctx.strokeStyle = '#000';
    ctx.strokeRect(20 + (i * 100), 50, 80, 100);
    ctx.fillText(vip.name, 25 + (i * 100), 70);
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(20 + (i * 100), 100);
      ctx.lineTo(20 + ((i - 1) * 100) + 80, 100);
      ctx.stroke();
    }
    if (vip.photo) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 25 + (i * 100), 80, 70, 60);
      img.src = vip.photo;
    }
  });
  
  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000, () => console.log('Guardian/SOL running on port 3000'));