import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';


// สร้าง Express app
const app = express();

// สร้าง HTTP server จาก Express app
const server = http.createServer(app);

// สร้าง Socket.io server จาก HTTP server
const io = new Server(server);
// Middlewares
app.use(bodyParser.json());
app.use(cors());
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'view')));
app.use('/public', express.static(path.join(__dirname, 'public')));


// เชื่อม MongoDB
mongoose.connect('mongodb+srv://test:099227@test.jcccez1.mongodb.net/?retryWrites=true&w=majority&appName=test', {

})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


io.on('connection', (socket) => {
    console.log('ผู้ใช้เชื่อมต่อแล้ว');

    socket.on('sendSticker', (sticker) => {
        io.emit('receiveSticker', sticker); // ส่งสติ๊กเกอร์ให้ทุกคน
    });

    socket.on('disconnect', () => {
        console.log('ผู้ใช้ออกจากเว็บ');
    });
});


// Schema สำหรับผู้ใช้
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

// ------------------- Register -------------------

// Schema สำหรับคะแนน
const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

//
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'กรอกข้อมูลให้ครบ' });
    }

    try {
        // ตรวจสอบ username ซ้ำ
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }

        // สร้างผู้ใช้ใหม่ (เก็บ password เป็น plaintext)
        const newUser = new User({
            username,
            password, // ไม่เข้ารหัส
            role: 'user'
        });
        await newUser.save();

        // สร้างคะแนนเริ่มต้นใน DB พร้อม userId
        const newScore = new Score({
            userId: newUser._id,
            score: 0
        });
        await newScore.save();

        // ส่ง userId กลับ client
        res.json({ success: true, message: 'สมัครสมาชิกเรียบร้อย!', userId: newUser._id });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ------------------- Login -------------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ success: false, message: 'กรอกข้อมูลให้ครบ' });
    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(400).json({ success: false, message: 'ผู้ใช้ไม่ถูกต้อง' });

        const isMatch = password === user.password;
        if (!isMatch)
            return res.status(400).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
        res.json({ success: true, message: 'เข้าสู่ระบบเรียบร้อย', userId: user._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



// Schema สำหรับคำตอบ
const answerSchema = new mongoose.Schema({
    question: String,  // ส่งเป็นประโยคคำถาม
    answer: String,
    timestamp: { type: Date, default: Date.now }
});

const Answer = mongoose.model('Answer', answerSchema);

// Route รับคำตอบ
app.post('/submit-answer', async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ success: false, message: 'ต้องส่ง question และ answer' });
    }

    try {
        const newAnswer = new Answer({ question, answer });
        await newAnswer.save();
        res.json({ success: true, message: 'บันทึกคำตอบเรียบร้อย!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// Submit Score
app.post('/submit-score', async (req, res) => {
    const { userId, score } = req.body;

    if (!userId || score == null) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) {
        return res.status(400).json({ success: false, message: 'คะแนนไม่ถูกต้อง' });
    }

    try {
        // update score ครั้งล่าสุด หรือสร้างใหม่ถ้ายังไม่มี
        await Score.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { score: numericScore, date: new Date() },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'บันทึกคะแนนเรียบร้อย!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



// Get latest score
app.get('/get-score/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const scoreData = await Score.findOne({ userId }).sort({ date: -1 });
        if (!scoreData) return res.json({ score: 0 });
        res.json({ score: scoreData.score });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Schema เก็บข้อมูลผู้ใช้เพิ่มเติม
const profileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);

// Route บันทึกข้อมูลโปรไฟล์
app.post('/save-profile', async (req, res) => {
    const { name, age, gender } = req.body;

    if (!name || !age || !gender) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    try {
        const newProfile = new Profile({ name, age, gender });
        await newProfile.save();
        res.json({ success: true, message: 'บันทึกข้อมูลเรียบร้อย!', profileId: newProfile._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'index.html'));
});



const PORT = process.env.PORT || 3000; // ใช้ port ของ Render หรือ fallback เป็น 3000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
