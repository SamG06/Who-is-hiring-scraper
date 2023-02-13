const puppeteer = require('puppeteer');

const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);


const minutes = 600 * 3000;


(() => {
setInterval(() => {
    getJobPosts();
}, minutes)
})()

const errorConstructor = (msg) => {
    return { statusCode: 500, error: msg }
 }

let jobPackage = null;

const getJobPosts = async () => {
    const browser = await puppeteer.launch({
        executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
    try {
    const page = await browser.newPage();

    // Not loading what we don't need from the page
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // The main page with all the listings for whoishiring
    const ycom = 'https://news.ycombinator.com/';

    try{
        await page.goto(ycom + 'submitted?id=whoishiring');
    }
    catch (e) {
        console.error('Something went wrong. You can cry now.', e);
        return;
    }

    // Grab all posts
    const allPosts = await page.evaluate(() => Array.from(document.querySelectorAll('.titleline a'), e => {
        if (e.textContent.includes('Who is hiring')) {
            return e.getAttribute('href');
        }

        return null
    }));
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);

    console.log(data)

    
    if(!allPosts.length){
        throw new Error('All post returned nothing.')
    } 

    const jobPostPageLinks = allPosts.filter(post => post !== null);

    if(!jobPostPageLinks.length){
        throw new Error('Job post page links not found.')
    }

    let pageNum = 1;
    let noMorePages = false;
    let allJobPosts = [];

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    
    while (noMorePages === false) {
        await sleep(9000); // Don't parse too fast and get blocked :3

        const mostRecentMonthPage = `${ycom}${jobPostPageLinks[0]}&&p=${pageNum}`;
        console.log(mostRecentMonthPage)
        console.log('Page ' + pageNum);
        console.log(jobPostPageLinks[0]);

        await page.goto(mostRecentMonthPage, 'rm');

        const data = await page.evaluate(() => document.querySelector('*').outerHTML);

        console.log(data)
        const pageJobPosts = await page.evaluate((eval) => {
            const moreLink = document.querySelector('.moreLink');

            let month = document.querySelector('.titleline');
   

            if(month){
              month = month.innerText?.match(/\(([^)]+)\)/)[1]
              console.log('this ran')
            } else {
                throw new Error('No match for month. Please update' + mostRecentMonthPage)
            }


            const newArray = Array.from(document.querySelectorAll('.comtr'), e => { 
                e.querySelector('.reply').remove();
                // check if message is just a reply through indentation
                const indentWidth = e.querySelector('.ind img').width;
                if(indentWidth > 0){
                    return;
                }
                const element = e.querySelector('.comment .commtext');
                const date_time = e.querySelector('.age').title;

                if(!element){
                    return;
                }
                const jobPostNodes = element.childNodes;

                const title = jobPostNodes[0].textContent;
           
                const content =  [...element.querySelectorAll('p')].map(p => `<p>${p.innerHTML}</p>`).join('');
                   
                return { 
                    month,
                    title,
                    content,
                    date_time,
                    id: e.id,
                    indentWidth
                } 
            });

            return { moreLink, newArray };
        })

        const { moreLink, newArray } = pageJobPosts;
        allJobPosts = newArray.concat(allJobPosts);

        if (!moreLink) {
            noMorePages = true;
        }

        pageNum += 1;
    }



    const newJobPackage = [];
    
    allJobPosts.forEach((job) => {
        const data = job;
        if(!job){
            return;
        }
        if (job.title != '') {
            data.content = DOMPurify.sanitize(job.content, {USE_PROFILES: {html: true}});
            newJobPackage.push(data);
        }

    })

   
    jobPackage = {statusCode: 200, jobs: newJobPackage, date_updated: new Date()};
    
    await browser.close();

    return jobPackage

    } catch (error) {
         jobPackage = errorConstructor(error.message)
         getJobPosts()
         return
    } finally {
        await browser.close();
    }
}

const sendJobPackage = async (request, reply) => {
    if (!jobPackage) await getJobPosts();
    
    reply.code(jobPackage.statusCode).send(jobPackage);
}

module.exports = sendJobPackage; 