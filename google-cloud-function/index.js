const gm = require('gm').subClass({imageMagick: true});
const path = require('path');
const os = require('os');
const fs = require('fs');
const faunadb = require('faunadb');

// Fauna
const faunaClient = new faunadb.Client({secret: process.env.FAUNA_SECRET});
const {Update, Ref, Collection} = faunadb.query;

// Storage
const storage = require('@google-cloud/storage')();
const bucketImages = storage.bucket(process.env.BUCKET_IMAGES_NAME);
const bucketThumbnails = storage.bucket(process.env.BUCKET_THUMBNAILS_NAME);

exports.createThumbnail = async (event, context) => {
	const filename = event.name;

	// Download image from bucket to VM
	const originalFilePath = path.join(os.tmpdir(), filename);
	await bucketImages.file(filename).download({
		destination: originalFilePath
	});

	// Resize image with Image Magick
	const thumbFilePath = path.join(os.tmpdir(), 'thumb.jpg');
	await new Promise((resolve, reject) => {
		gm(originalFilePath).resize(400, 300).write(thumbFilePath, (error, stdout) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
	});

	// Upload thumbnail to bucket
	await bucketThumbnails.upload(thumbFilePath, {
		destination: filename
	});

	// Update the Fauna document
	const documentId = filename.split('.')[0];
	const thumbnailUrl = `https://storage.googleapis.com/${process.env.BUCKET_THUMBNAILS_NAME}/${filename}`;

	await faunaClient.query(
		Update(
			Ref(Collection('Images'), documentId),
			{
				data: {
					status: 'THUMBNAIL_READY',
					thumbnailUrl
				}
			}
		)
	);
};