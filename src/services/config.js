const DiscordRSS = require('discord.rss')
const KeyValue = require('discord.rss').KeyValue

async function getFeedConfig () {
  const feedConfig = await KeyValue.get('feedConfig')
  if (feedConfig) {
    return feedConfig.toJSON().value
  } else {
    return DiscordRSS.schemas.feeds.validate({}).value
  }
}

module.exports = {
  getFeedConfig
}
