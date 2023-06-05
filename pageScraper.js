require('dotenv').config()
const fs = require('fs');
const pixelmatch = require('pixelmatch');
const JPEG = require('jpeg-js');

const scraperObject = {
	successCodes: [
		200,
		304
	],
	async scraper(browser) {
		let urlObj = JSON.parse(process.env.WEBSITES)
		let basePaths = process.env.BASE_PATH.split(',')
		const MAX_SHOT = parseInt(process.env.MAX_SHOT)
		let shotTaken = {};
		let viewPort = JSON.parse(process.env.VIEW_PORT)
		viewPort.width = parseInt(viewPort.width)
		viewPort.height = parseInt(viewPort.height)
		const page = await browser.newPage();

		// Set up the view port.
		await page.setViewport(viewPort);
		console.log('Base path to check:')
		console.log(basePaths)
		console.log('Websites:')
		console.log(urlObj)
		try {
			// open the page to scrape
			await page.goto(urlObj.production);
			// execute the JS in the context of the page to get all internal links in a menu
			const linkSel = "li > a[href^='" + urlObj.production + "'], li > a[href^='/'], li > a[href^='./'], li > a[href^='../']"
			// All links in menus.
			let links = await page.$$eval(linkSel, anchors =>
				anchors.map(anchor => [anchor.pathname, anchor.href, anchor.textContent])
			)

			let taken = 0;
			// Take screenshots for the base pathes.
			for (path of basePaths) {
				// Avoid duplicated link.
				if (shotTaken[path]) {
					continue;
				}
				shotTaken[path] = true;
				await this.takeScreenshots(urlObj.production + path, path, urlObj, page)
				if (taken++ == MAX_SHOT) {
					//Exceed max shot limit.
					break;
				}
			}
			// Take screenshots for links.
			for (link of links) {
				// Avoid duplicated link.
				if (shotTaken[link[0]]) {
					continue;
				}
				shotTaken[link[0]] = true;
				await this.takeScreenshots(link[1], link[0], urlObj, page)
				if (taken++ == MAX_SHOT) {
					//Exceed max shot limit.
					break;
				}
			}
		}
		catch (err) {
			console.log(err);
		}
		await page.close();
		return;
	},
	async takeScreenshots(baselineURL, path, urlObj, page) {
		const MEM_SIZE = parseInt(process.env.MEM_SIZE) ? parseInt(process.env.MEM_SIZE) : 512
		let candidateURL = urlObj.stage + path
		let jpegData1, jpegData2
		let img1,img2
		try {
			// Baseline page.
			let response = await page.goto(baselineURL, { waitUntil: ['domcontentloaded', 'networkidle0'] });
			if (!this.successCodes.includes(response.status())) {	
				console.log(response.status() + ':' + baselineURL)
				return;
			}
			page.waitForTimeout(4000);
			jpegData1 = await page.screenshot({
				type: 'jpeg',
				fullPage: true   // take a fullpage screenshot
			});
			if (jpegData1) {
				img1 = JPEG.decode(jpegData1, {maxMemoryUsageInMB: MEM_SIZE})
			}
			else {
				return
			}
			
			// Candidate page.
			await page.goto(candidateURL, { waitUntil: ['domcontentloaded', 'networkidle0'] });
			if (!this.successCodes.includes(response.status())) {
				console.log(response.status() + ':' + candidateURL)
				return;
			}
			page.waitForTimeout(4000);
			jpegData2 = await page.screenshot({ 
				type: 'jpeg',
				clip: {
					x: 0,
					y: 0,
					width: img1.width,
					height: img1.height
				}
			});
			if (jpegData2) {				
				img2 = JPEG.decode(jpegData2, {maxMemoryUsageInMB: MEM_SIZE})
				const maxSize = img1.height * img1.width * 4
				const diffBuffer = Buffer.alloc(maxSize)
				const diff = { width: img1.width, height: img1.height, data: diffBuffer }
				// Compare those two screenshots.
				const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.2 })
				if (numDiffPixels) {
					this.saveScreenshot(urlObj.host, path, jpegData1, jpegData2, diff)
				}
				else {
					console.log('Difference for "' + path + '" is ' + numDiffPixels)
				}
			}
		}
		catch (err) {
			console.log(err);
			console.log('Error to ' + path);
		}
	},
	async saveScreenshot(hostName, imgPath, baseline, candidate, diff) {
		let imgFolder = 'screenshot/' + hostName
		if (imgPath === '/') {
			imgPath = imgFolder + '/'
		}
		else {
			imgPath = imgPath.endsWith('/') ? imgFolder + imgPath : imgFolder + imgPath + '/';
		}

		try {
			if (!fs.existsSync(imgPath)) {
				// Create the folder for saving screenshots.
				fs.mkdirSync(imgPath, { recursive: true });
			}
			// Saving the baseline screenshot.
			fs.writeFileSync(imgPath + 'baseline.jpg', baseline)
			// Saving the candidate screenshot.
			fs.writeFileSync(imgPath + 'candidate.jpg', candidate)
			// Saving the diff picutre.
			let jpegImageData = JPEG.encode(diff, 50); // image quality is 50.
			fs.writeFileSync(imgPath + 'diff.jpg', jpegImageData.data)
			console.log(imgPath + 'diff.jpg' + ' is saved.')
		}
		catch (err) {
			console.log(err);
		}
	}
}

module.exports = scraperObject;
