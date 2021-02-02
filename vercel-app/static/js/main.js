import {h, Component, render, createRef} from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';

const html = htm.bind(h);

const faunadb = window.faunadb;
const {Ref, Collection} = faunadb.query;
const faunaClient = new faunadb.Client({
	secret: 'fnAEAljlZZACBk1sm8pK_M0jYYELASNStPDCfQyc',
});

const AppStates = {
	WAITING_FOR_FILE: 'WAITING_FOR_FILE',
	UPLOADING_FILE: 'UPLOADING_FILE',
	WAITING_FOR_THUMBNAIL: 'WAITING_FOR_THUMBNAIL',
	DISPLAYING_THUMBNAIL: 'THUMBNAIL_READY'
}

class App extends Component {
	constructor() {
		super();

		this.state = {
			appState: AppStates.WAITING_FOR_FILE,
			thumbnailUrl: null
		};
	}

	async uploadFile (file) {

		this.setState({appState: AppStates.UPLOADING_FILE});

		const response = await fetch('/api/upload', {
		  method: 'POST',
		  headers: {
		  	'content-type': 'application/octet-stream'
		  },
		  body: file
		});

		const responseBody = await response.json();
		this.initStream(responseBody.documentId);
	}

	initStream (documentId) {
		if (this.faunaStream) this.faunaStream.destroy();
		this.faunaStream = new FaunaStream(faunaClient, Ref(Collection('Images'), documentId));
		this.faunaStream.initStream();

		this.faunaStream.onUpdate.add((document) => {
			const status = document.data.status;
			const newState = {appState: AppStates[status]};

			if (document.data.thumbnailUrl) {
				newState.thumbnailUrl = document.data.thumbnailUrl;
			}

			this.setState(newState);
		});
	}

	render () {
		switch (this.state.appState) {
			case AppStates.WAITING_FOR_FILE:
				return html`<${DropFile} onFileSelected=${this.uploadFile.bind(this)}/>`;
				break;
			case AppStates.UPLOADING_FILE:
				return html`<div class="spinner"></div><h2>Uploading file!</h2>`;
				break;
			case AppStates.WAITING_FOR_THUMBNAIL:
				return html`<div class="spinner"></div><h2>Waiting for thumbnail!</h2>`
				break;
			case AppStates.THUMBNAIL_READY:
				return html`<img src="${this.state.thumbnailUrl}" />`;
				break;
		}
	}
}

class DropFile extends Component {

	onDropFile (event) {
		event.preventDefault();
		const items = event.dataTransfer.items;

		if (items.length > 1) {
			alert('Only 1 file can dropped!');
			return;
		}

		this.props.onFileSelected(items[0].getAsFile());
	}

	render () {
		return html`
			<div class="DropFile" onDrop=${this.onDropFile.bind(this)} onDragOver=${e => e.preventDefault()}>
				<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 16 16">
				  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
				  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
				</svg>
				Drop a JPG file in here!
			</div>
		`;
	}
}

render(html`<${App} name="World" />`, document.body);