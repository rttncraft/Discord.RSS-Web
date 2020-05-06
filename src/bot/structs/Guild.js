const Discord = require('discord.js')
const Base = require('./Base.js')
const GuildMember = require('./GuildMember.js')
const Role = require('./Role.js')
const Channel = require('./Channel.js')
const promisify = require('util').promisify

class Guild extends Base {
  constructor (id, keysToFetch) {
    super(id, keysToFetch)
    this.name = ''
    this.iconURL = ''
    this.ownerID = ''
    this.shard = 0
    this.channels = []
    this.roles = []
  }

  async retrieve (redisClient) {
    const fetchChannels = this._toFetch.includes('channels') || this._fetchAll
    const fetchRoles = this._toFetch.includes('roles') || this._fetchAll
    const promiseArr = [Guild.utils.get(redisClient, this.id)]
    if (fetchChannels) promiseArr.push(Channel.utils.getChannelsOfGuild(redisClient, this.id))
    if (fetchRoles) promiseArr.push(Role.utils.getRolesOfGuild(redisClient, this.id))
    const [data, channels, roles] = await Promise.all(promiseArr)
    this._fetched = true
    if (!data) return
    this.exists = true
    this.name = data.name
    this.iconURL = data.iconURL
    this.ownerID = data.ownerID
    this.shard = data.shard
    if (fetchChannels) this.channels = channels
    if (fetchRoles) this.roles = roles
  }

  async toJSON () {
    return {
      ...super.toJSON(),
      channels: this.channels,
      roles: this.roles
    }
  }

  static get utils () {
    return {
      REDIS_KEYS: {
        guilds: guildID => { // This is a HASH. Guilds with their data that have been cached.
          if (!guildID) throw new TypeError('Guild data and ID must be provided')
          return `drss_guild_${guildID}`
        }
      },
      JSON_KEYS: ['name', 'iconURL', 'ownerID', 'shard'],
      recognize: async (redisClient, guild) => {
        if (!(guild instanceof Discord.Guild)) throw new TypeError('Guild is not instance of Discord.Guild')
        const multi = redisClient.multi()
        const toStore = {}
        this.utils.JSON_KEYS.forEach(key => {
          // MUST be a flat structure
          if (key === 'shard') {
            toStore[key] = guild.shardID === undefined ? '' : guild.shardID
          } else if (key === 'iconURL') {
            toStore[key] = guild.iconURL({
              format: 'png'
            }) || ''
          } else {
            toStore[key] = guild[key] || ''
          }
        })
        multi.hmset(this.utils.REDIS_KEYS.guilds(guild.id), toStore)
        guild.members.cache.forEach(member => GuildMember.utils.recognizeTransaction(multi, member))
        guild.channels.cache.forEach(channel => Channel.utils.recognizeTransaction(multi, channel))
        guild.roles.cache.forEach(role => Role.utils.recognizeTransaction(multi, role))
        return new Promise((resolve, reject) => multi.exec((err, res) => err ? reject(err) : resolve(res)))
      },
      update: async (redisClient, oldGuild, newGuild) => {
        if (!(oldGuild instanceof Discord.Guild) || !(newGuild instanceof Discord.Guild)) throw new TypeError('Guild is not instance of Discord.Guild')
        const exists = await promisify(redisClient.exists).bind(redisClient)(this.utils.REDIS_KEYS.guilds(newGuild.id))
        if (!exists) return Guild.utils.recognize(newGuild)
        const toStore = {}
        let u = 0
        this.utils.JSON_KEYS.forEach(key => {
          if (newGuild[key] !== oldGuild[key]) {
            toStore[key] = newGuild[key] || ''
            ++u
          }
        })
        if (u === 0) return 0
        return promisify(redisClient.hmset).bind(redisClient)(this.utils.REDIS_KEYS.guilds(newGuild.id), toStore)
      },
      forget: async (redisClient, guild) => {
        if (!(guild instanceof Discord.Guild)) throw new TypeError('Guild is not instance of Discord.Guild')
        const multi = redisClient.multi()
        multi.del(this.utils.REDIS_KEYS.guilds(guild.id))
        guild.members.cache.forEach(member => GuildMember.utils.forgetTransaction(multi, member))
        guild.channels.cache.forEach(channel => Channel.utils.forgetTransaction(multi, channel))
        guild.roles.cache.forEach(role => Role.utils.forgetTransaction(multi, role))
        return new Promise((resolve, reject) => multi.exec((err, res) => err ? reject(err) : resolve(res)))
      },
      get: async (redisClient, guildID) => {
        if (!guildID || typeof guildID !== 'string') throw new TypeError('guildID not a valid string')
        return promisify(redisClient.hgetall).bind(redisClient)(this.utils.REDIS_KEYS.guilds(guildID))
      },
      getValue: async (redisClient, guildID, key) => {
        if (!this.utils.JSON_KEYS.includes(key)) throw new Error('Unknown key for guild:', key)
        if (!guildID || !key) throw new TypeError('guildID or key is undefined')
        return promisify(redisClient.hget).bind(redisClient)(this.utils.REDIS_KEYS.guilds(guildID), key)
      },
      exists: async (redisClient, guildID) => {
        if (!guildID || typeof guildID !== 'string') throw new TypeError('guildID not a valid string')
        return promisify(redisClient.exists).bind(redisClient)(this.utils.REDIS_KEYS.guilds(guildID))
      }
    }
  }
}

module.exports = Guild
