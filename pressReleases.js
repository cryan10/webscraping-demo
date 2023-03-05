const contentful = require('contentful-management');
const data = require('./data/pressReleaseData.json');
const { parseHtml } = require('contentful-html-rich-text-converter');

async function connectToContentful() {
	const client = await contentful.createClient({
		accessToken: 'replace this text with your Contentful access token' //your access token goes here
	});

	const space = await client.getSpace(
		'replace this text with your Contentful space ID' //your space ID goes here
	);
	return await space.getEnvironment('master');
}

function convertDataToRichText(data) {
	let result = parseHtml(data);

	return result;
}

async function getImageFileType(url) {
	let fileType = url.split(/[#?]/)[0].split('.').pop().trim();

	if (fileType.toLocaleLowerCase() === 'jpg') {
		fileType = 'jpeg';
	}

	return 'image/' + fileType;
}

async function getImageFileName(url) {
	let filename = url.substring(url.lastIndexOf('/') + 1);
	filename = filename.replace(/[\#\?].*$/, '');

	return filename;
}

(async () => {
	let environment = await connectToContentful();

	for (let i = 0; i < data.length; i++) {
		//create and publish metadata
		let metaDataId = await environment
			.createEntry('metadata', {
				fields: {
					title: {
						'en-US': data[i].title
					},
					description: {
						'en-US': data[i].metaDescription
					}
				}
			})
			.then((entry) => entry.publish())
			.then((entry) => {
				return entry.sys.id;
			})
			.catch(data[i].metaDescription + ': ' + console.error);

		//create image asset
		let imageId = await environment
			.createAsset({
				fields: {
					title: {
						'en-US': data[i].altText
					},
					description: {
						'en-US': data[i].altText
					},
					file: {
						'en-US': {
							contentType: await getImageFileType(data[i].src), //pass src url as param
							fileName: await getImageFileName(data[i].src), //pass src url as param
							upload: data[i].src
						}
					}
				}
			})
			//process image asset
			.then((asset) => environment.getAsset(asset.sys.id))
			.then((asset) => asset.processForLocale('en-US'))
			//publish image asset
			.then((asset) => asset.publish())
			.then((asset) => {
				return asset.sys.id;
			})
			.catch(console.error);

		//create press release
		let pressrelease = await environment
			.createEntry('pressRelease', {
				fields: {
					title: {
						'en-US': data[i].title
					},
					slug: {
						'en-US': data[i].url
					},
					date: {
						'en-US': data[i].date
					},
					metadata: {
						'en-US': {
							sys: {
								type: 'Link',
								linkType: 'Entry',
								id: metaDataId
							}
						}
					},
					image: {
						'en-US': {
							sys: {
								type: 'Link',
								linkType: 'Asset',
								id: imageId
							}
						}
					},
					body: {
						'en-US': await convertDataToRichText(data[i].text)
					}
				}
			})
			.then((entry) => entry.publish());
	}
})();
