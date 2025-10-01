import { createCanvas, loadImage, registerFont } from "canvas";
import FormData from "form-data";
import axios from "axios";
import path from "path";

// Fontu public/fonts içine koy
const fontPath = path.resolve("./public/fonts/Poppins-Bold.ttf");
registerFont(fontPath, { family: "Poppins" });

// imgbb API key
const IMGBB_KEY = "b9db5cf8217dccada264cff99e9742bd";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      year,
      month,
      avatarUrl,
      backgroundUrl,
      textColor = "#FFFFFF"
    } = req.body;

    // Tarihleri ayarla
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month ? month - 1 : now.getMonth(); // JS ayları 0-11
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const firstDay = new Date(y, m, 1).getDay(); // 0 = Sunday
    const lastDate = new Date(y, m + 1, 0).getDate();

    // Canvas
    const width = 1080;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);
    }

    // Avatar
    const avatarSize = 100;
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(60 + avatarSize/2, 60 + avatarSize/2, avatarSize/2, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 60, 60, avatarSize, avatarSize);
      ctx.restore();
    } catch {}

    // Ay ve yıl yazısı
    ctx.fillStyle = textColor;
    ctx.font = "bold 30px Poppins";
    ctx.fillText(`${monthNames[m]} ${y}`, 200, 100);

    // Gün isimleri
    ctx.font = "bold 20px Poppins";
    const days = ["Su","Mo","Tu","We","Th","Fr","Sa"];
    days.forEach((d,i) => {
      ctx.fillText(d, 200 + i*50, 150);
    });

    // Tarihler
    ctx.font = "18px Poppins";
    let x = 200 + firstDay*50;
    let yPos = 180;
    for(let d=1; d<=lastDate; d++) {
      ctx.fillText(d.toString(), x, yPos);
      x += 50;
      if((firstDay + d) % 7 === 0) {
        x = 200;
        yPos += 40;
      }
    }

    // Canvas → Buffer → Base64
    const buffer = canvas.toBuffer("image/png");
    const base64 = buffer.toString("base64");

    // imgbb upload
    const form = new FormData();
    form.append("image", base64);

    const imgbbRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      form,
      { headers: form.getHeaders() }
    );

    res.status(200).json({ image: imgbbRes.data.data.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate calendar" });
  }
        }
