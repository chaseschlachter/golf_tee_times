const puppeteer = require('puppeteer');
const cron = require('node-cron');
const { run } = require('node:test');
const userInputs = require('./userInputs.js');
const nodemailer = require('nodemailer');
require('dotenv').config();

let previousData = {}; // Store previous data
let currentData = {}; // Declare currentData in a higher scope
// let name, date, time; // Declare name, date, and time in the outer scope

// console.log('Script started at', new Date().toLocaleString());
// // cron.schedule('*/15 7-18 * * *', () => { // Runs every 15 minutes between 07:00 and 18:00 CST
// cron.schedule('*/5 7-18 * * *', () => { // Runs every 5 minutes between 07:00 and 18:00 CST
//     // cron.schedule('* 7-18 * * *', () => { // Runs every minute between 07:00 and 18:00 CST
//     runScript()
//         .then(() => {
//             console.log('Script completed successfully at ', new Date().toLocaleString());
//         })
//         .catch(error => {
//             console.error('Script error:', error);
//         });
// });


// Input date string
const inputDateStr = userInputs.selectedDate;
const numberofplayers = userInputs.numberOfPlayers;

// Split the date string by '/' to get individual components
const [month, day, year] = inputDateStr.split('/');

// Create a new Date object and set the components
const formattedDate = new Date(year, month - 1, day);

// Convert the Date object to a string with the desired format
const formattedDateString = `${formattedDate.getMonth() + 1}%2F${formattedDate.getDate()}%2F${formattedDate.getFullYear()}`;

// const url = `https://web2.myvscloud.com/wbwsc/txaustinwt.wsc/search.html?Action=Start&SubAction=&_csrf_token=it6J186U1R0J2D451P3I314K4Q5S55570A6T4Q5H556H5P4F6C56685S3K554X1K004J5B541G544N524V1K4R4O5O51185P4O56510701565C6773033L5C44715K4R6N&secondarycode=&begintime=12%3A00+am&begindate=${formattedDateString}&numberofplayers=${numberofplayers}&numberofholes=18&display=detail&module=GR&multiselectlist_value=&grwebsearch_buttonsearch=yes`;
const url = `https://web2.myvscloud.com/wbwsc/txaustinwt.wsc/search.html?Action=Start&SubAction=&_csrf_token=Sj056Y0G0A163D4J1Y4X2X624Y4G525A086A4M6568715E4Z6L5A1R5Y3X54510360516G4J1D6S5J5E5A090A694I6A1C5Q675W6A6W6V4L665E095Y526R5S725G4S5I&secondarycode=&begintime=12%3A00+am&begindate=11%2F19%2F2023&numberofplayers=4&numberofholes=18&display=detail&module=GR&multiselectlist_value=&grwebsearch_buttonsearch=yes`;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Function to compare data objects and user parameters
function compareDataAndParameters(data, parameters) {
    // Extract user parameters
    const { startTime, endTime, selectedDate, numberOfPlayers, courseName } = parameters;
    // console.log("user parameters ", parameters);

    // Function to convert time from AM/PM format to 24-hour format
    function convertTo24HourFormat(timeStr) {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':');
        let hours24 = parseInt(hours, 10);
        if (period === 'pm' && hours24 !== 12) {
            hours24 += 12;
        } else if (period === 'am' && hours24 === 12) {
            hours24 = 0;
        }
        return `${hours24.toString().padStart(2, '0')}:${minutes}`;
    }

    // Convert user-entered times to 24-hour format
    const startTime24 = convertTo24HourFormat(startTime);
    const endTime24 = convertTo24HourFormat(endTime);

    // Separate functions for different course name filters
    function filterByCourseNameAny(item) {
        // Filter out entries with courseName "Any" (case-insensitive and trimmed)
        return item.name.trim().toLowerCase() !== 'any';
    }

    function filterByCourseNameSelected(item) {
        // Filter by specific courseName (case-insensitive and trimmed)
        return (item.name && courseName) && (item.name.trim().toLowerCase() === courseName.trim().toLowerCase());
    }

    // Apply the appropriate filter based on courseName
    const filterFunction = courseName.trim().toLowerCase() === 'any' ? filterByCourseNameAny : filterByCourseNameSelected;

    // Filter and iterate through the data objects
    const filteredData = currentData.filter(filterFunction);
    
    for (const item of filteredData) {
        // Convert item time to 24-hour format
        const itemTime24 = convertTo24HourFormat(item.time);

        // Check if the number of players matches the user's specified number of players
        if (
            item.players == numberOfPlayers &&
            item.date == selectedDate &&
            itemTime24 >= startTime24 &&
            itemTime24 <= endTime24
        ) {
            console.log("Match found:", item.name, item.date, item.time);
            return item;
        }
    }

    console.log("No matching data found.");
    return null;
}



async function getTextByXPath(page, xpath) {
    const element = await page.$x(xpath);
    if (element.length > 0) {
        const text = await element[0].evaluate(node => node.textContent);
        return text.trim();
    }
    return null;
}

function compareData(data1, data2) {
    return JSON.stringify(data1) === JSON.stringify(data2);
}

async function runScript() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the website and extract data
    console.log("Navigating to ", url)
    await page.goto(url);

    // first batch of data
    const name1 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr/td[1]');
    const date1 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr/td[2]');
    const time1 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr/td[3]');
    const players1 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr[1]/td[5]');

    // second batch of data
    const name2 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr[2]/td[1]');
    const date2 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr[2]/td[2]');
    const time2 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr[2]/td[3]');
    const players2 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[2]/table/tbody/tr[2]/td[5]');

    // third batch of data
    const name3 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[3]/table/tbody/tr/td[1]');
    const date3 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[3]/table/tbody/tr/td[2]');
    const time3 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[3]/table/tbody/tr/td[3]');
    const players3 = await getTextByXPath(page, '/html/body/div[1]/div/div/div/b/font/b/font/font/font/form/div[1]/div[2]/div/div[1]/div[3]/table/tbody/tr/td[5]');

    await browser.close();

    // const name1 = 'Lions Municipal Golf Course';
    // const date1 = '11/19/2023';
    // const time1 = '3:50 pm';
    // const players1 = '4';

    // const name2 = null;
    // const date2 = null;
    // const time2 = null;
    // const players2 = null;

    // const name3 = 'Roy Kizer Golf Course';
    // const date3 = '11/19/2023';
    // const time3 = '4:01 pm';
    // const players3 = '4';

    // console.log(`Name: ${name1}`);
    // console.log(`Date: ${date1}`);
    // console.log(`Time: ${time1}`);

    // console.log(`Name: ${name2}`);
    // console.log(`Name: ${date2}`);
    // console.log(`Name: ${time2}`);

    // console.log(`Name: ${name3}`);
    // console.log(`Name: ${date3}`);
    // console.log(`Name: ${time3}`);

    const data = [];

    // Simulate fetching data
    const data1 = {
        name: name1,
        date: date1,
        time: time1,
        players: players1,
    };

    const data2 = {
        name: name2,
        date: date2,
        time: time2,
        players: players2,
    };

    const data3 = {
        name: name3,
        date: date3,
        time: time3,
        players: players3,
    };

    data.push(data1, data2, data3);

    // Assign values to currentData using the outer scope variables
    currentData = data;

    // Update previous data
    // previousData = currentData;
    previousData = null;

    return currentData;
}

async function main() {
    const currentData = await runScript();
    console.log("currentData from main() ", currentData);

    if (compareData(currentData, previousData)) {
        // console.log("currentData ", currentData);
        // console.log("previousData ", previousData);
        console.log("Data is the same as the previous data from compareData at bottom.");
    } else {
        console.log('Data is different from the previous data.');
    
        // Validate currentData against user parameters
        const matchingItem = compareDataAndParameters(currentData, userInputs);

        if (matchingItem) {
            console.log("Data matches user parameters.");
            // Perform any additional actions here when data matches user parameters
            mailer(matchingItem).catch(console.error);
    
        } else {
            console.log('Data does not match user parameters.');
            // Perform any additional actions here when data does not match user parameters
        }
    }
}


main();


// async..await is not allowed in global scope, must use a wrapper
async function mailer(matchingItem) {
    if (matchingItem) {
        console.log("Sending email with nodemailer...", matchingItem.name, matchingItem.time, matchingItem.date);
        // send mail with defined transport object
        const info = await transporter.sendMail({
            from: 'chase@macrotickets.com', // sender address
            to: "chase@syndesi.io", // list of receivers
            subject: "Tee time available", // Subject line
            text: inputDateStr, // plain text body
            html: `${matchingItem.name} ${matchingItem.time} ${matchingItem.date} ${url}`, // html body
        });

        console.log("Message sent: %s", info.messageId);
    } else {
        console.log("No matching data found. No email sent.");
    }
}
