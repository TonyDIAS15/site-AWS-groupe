const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");

const app = express();
const port = 3000;

// Forcer l'utilisation du profil "default" de ~/.aws/credentials
AWS.config.update({
  region: "us-east-1", // adapte selon ta région
  credentials: new AWS.SharedIniFileCredentials({ profile: 'default' })
});

const ec2 = new AWS.EC2();
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// --- EC2 ---
app.get("/api/ec2", async (req, res) => {
  try {
    const data = await ec2.describeInstances().promise();
    let instances = [];
    data.Reservations.forEach(r => {
      r.Instances.forEach(i => {
        instances.push({
          InstanceId: i.InstanceId,
          State: i.State.Name,
          Type: i.InstanceType
        });
      });
    });
    res.json(instances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- S3 ---
app.get("/api/s3", async (req, res) => {
  try {
    const data = await s3.listBuckets().promise();
    res.json(data.Buckets.map(b => b.Name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/s3/create", upload.single("file"), async (req, res) => {
  try {
    const bucketName = req.body.bucketName;
    await s3.createBucket({ Bucket: bucketName }).promise();

    if (req.file) {
      await s3.putObject({
        Bucket: bucketName,
        Key: req.file.originalname,
        Body: req.file.buffer
      }).promise();
    }

    res.json({ message: "Bucket créé et fichier uploadé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/s3/:name", async (req, res) => {
  try {
    await s3.deleteBucket({ Bucket: req.params.name }).promise();
    res.json({ message: "Bucket supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${port}`);
});
