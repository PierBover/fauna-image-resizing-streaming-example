class FaunaStream {
	constructor (client, documentRef) {
		this.client = client;
		this.documentRef = documentRef;
		this.onUpdate = new signals.Signal();
	}

	initStream () {
		this.stream = this.client.stream.document(this.documentRef);

		this.stream.on('snapshot', (data, event) => {
			console.log(event.type, {data, event});
			this.onUpdate.dispatch(data);
		});

		this.stream.on('version', (data, event) => {
			console.log(event.type, {data, event});
			this.onUpdate.dispatch(data.document);
		});

		this.stream.on('error', (data, event) => {
			console.log('error', {data, event});
			this.stream.close();
			setTimeout(() => {
				this.initStream();
			}, 250);
		});

		this.stream.start();
	}

	destroy () {
		this.stream.close();
		this.onUpdate.removeAll();
	}
}