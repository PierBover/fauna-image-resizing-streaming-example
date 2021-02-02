import faunadb from 'faunadb';
import {Storage} from '@google-cloud/storage';

console.log(process.env);

const storage = new Storage({
	projectId: process.env.GOOGLE_PROJECT_ID,
	credentials: {
		client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
		private_key: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
	}
});

const bucket = storage.bucket(process.env.PRIVATE_BUCKET_NAME);

const faunaClient = new faunadb.Client({secret: process.env.FAUNA_SECRET});
const {Create, Collection, Update, Ref} = faunadb.query;

export default async function (request, response) {

	const document = await faunaClient.query(
		Create(
			Collection('Images'),
			{
				data: {
					status: 'UPLOADING'
				}
			}
		)
	);

	const documentId = document.ref.id;
	await bucket.file(document.ref.id + '.jpg').save(request.body);

	await faunaClient.query(
		Update(
			Ref(Collection('Images'), documentId),
			{
				data: {
					status: 'WAITING_FOR_THUMBNAIL'
				}
			}
		)
	);

	response.send({documentId});
};