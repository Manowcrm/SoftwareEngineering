const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath));

// OAuth2 client setup
const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Generate authentication URL
function getAuthUrl() {
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
}

// Set tokens after authentication
function setTokens(tokens) {
  oAuth2Client.setCredentials(tokens);
}

// Create a calendar event
async function createEvent(eventDetails) {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  const event = {
    summary: eventDetails.summary,
    location: eventDetails.location,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startDateTime,
      timeZone: eventDetails.timeZone,
    },
    end: {
      dateTime: eventDetails.endDateTime,
      timeZone: eventDetails.timeZone,
    },
    attendees: eventDetails.attendees, // Array of attendee emails
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    console.log('Event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error.message);
    throw error;
  }
}

module.exports = { getAuthUrl, setTokens, createEvent };