const AWS = require("aws-sdk");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();
const app = express();

// Set up AWS S3 bucket configuration
const s3 = new AWS.S3({
  accessKeyId: "AKIAZXDCNFFDJUTE5YHS",
  secretAccessKey: "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",
  region: "us-east-2",
  useAccelerateEndpoint: true,
});
let bucketName = "ftp-bucket-s3-upload";

// Set up bodyParser to parse incoming requests
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Set up CORS
app.use(cors());

// // Set up Multer middleware to handle file uploads
// // by default, multer will store files in memory
const upload = multer();

// Initiate multipart upload and return uploadId
app.post("/initiateUpload", async (req, res) => {
  try {
    const { fileName } = req.body;
    console.log(fileName);
    const params = {
      Bucket:'ftp-bucket-s3-upload',
      Key: fileName,
    };
    const upload = await s3.createMultipartUpload(params).promise();
    res.json({ uploadId: upload.UploadId });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error initializing upload" });
  }
});

// Receive chunk and write it to S3 bucket
app.post("/upload", upload.single("file"), (req, res) => {
  const { index, fileName } = req.body;
  const file = req.file;

  const s3Params = {
    Bucket:'ftp-bucket-s3-upload',
    Key: fileName,
    Body: file.buffer,
    PartNumber: Number(index) + 1,
    UploadId: req.query.uploadId,
  };

  s3.uploadPart(s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, message: "Error uploading chunk" });
    }

    return res.json({ success: true, message: "Chunk uploaded successfully" });
  });
});

// Complete multipart upload
app.post("/completeUpload", (req, res) => {
  const { fileName, uploadId } = req.query;

  const s3Params = {
    Bucket: 'ftp-bucket-s3-upload',
    Key: fileName,
    UploadId: uploadId,
  };

  s3.listParts(s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Error listing parts" });
    }

    const parts = data.Parts.map((part) => ({
      ETag: part.ETag,
      PartNumber: part.PartNumber,
    }));

    const completeParams = {
      Bucket: 'ftp-bucket-s3-upload',
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };

    s3.completeMultipartUpload(completeParams, (err, data) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Error completing upload" });
      }

      console.log("data: ", data);
      return res.json({
        success: true,
        message: "Upload complete",
        data: data.Location,
      });
    });
  });
});



// Start the server
app.listen(4000, () => {
  console.log("Server started on port 3000");
});
