import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const bcrypt = require('bcryptjs');
const User = require('./models/User.js');
const Post = require('./models/Post.js');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs');

app.use(
  cors({ credentials: true, origin: 'https://blogs-i52i.onrender.com/' })
);
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// mongoose.Promise = global.Promise;
mongoose.set('strictQuery', false);
mongoose.connect(
  'mongodb+srv://parthsawant2001:parthsawant2001@cluster0.wlklme7.mongodb.net/?retryWrites=true&w=majority'
);

const salt = bcrypt.genSaltSync(10);
const secret = 'fieuwhfuihwruifhuirhfuirhu';
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(404).json(e);
    console.log(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  // res.json(passOk);
  if (passOk) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const token = req.cookies;
  console.log(token);
  // jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
  //   if (err) throw err;
  //   res.cookie('token', token).json({
  //     id: userDoc._id,
  //     username,
  //   });
  // });
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    // res.json(postDoc);
  });
});

app.get('/post', async (req, res) => {
  res.json(
    await Post.find().populate('author', ['username']).sort({ createdAt: -1 })
  );
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });
    // const postDoc = await Post.create({
    //   title,
    //   summary,
    //   content,
    //   cover: newPath,
    //   author: info.id,
    // });
    res.json(postDoc);
  });
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
});

// app.get('/', (req, res) => {
//   res.send(`Server running on PORT: ${PORT}`);
// });
// app.get('/contact', (req, res) => {
//   res.send(`Server running on PORT: ${PORT}`);
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// mongodb+srv://parthsawant2001:<parthsawant2001>@cluster0.ywawkzx.mongodb.net/?retryWrites=true&w=majority
