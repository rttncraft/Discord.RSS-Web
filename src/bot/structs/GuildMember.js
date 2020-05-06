const Discord = require('discord.js')
const Base = require('./Base.js')
const promisify = require('util').promisify
const MANAGE_CHANNELS_PERM = Discord.Permissions.FLAGS.MANAGE_CHANNELS

class GuildMember extends Base {
  constructor (data, keysToFetch) {
    super(data, keysToFetch)
    if (typeof data !== 'object' || !data.guildID) throw new Error('Guild ID must be provided to constructor')
    this.guildID = data.guildID
    this.isManager = false
  }

  async retrieve (redisClient) {
    const [isMember, isManager] = await Promise.all([
      GuildMember.utils.isMemberOfGuild(redisClient, this.id, this.guildID),
      GuildMember.utils.isManagerOfGuild(redisClient, this.id, this.guildID)
    ])
    this._fetched = true
    if (!isMember) return
    this.exists = true
    this.isManager = isManager
  }

  static get utils () {
    return {
      REDIS_KEYS: {
        membersOfGuild: guildID => { // This is a SET. Members that have been cheched and cached for validity. May contain invalid members.
          if (!guildID) throw new TypeError('Guild ID must be provided')
          return `drss_guild_${guildID}_members`
        },
        nonMembersOfGuild: guildID => { // This is a SET.
          if (!guildID) throw new TypeError('Guild ID must be provided')
          return `drss_guild_${guildID}_nonmembers`
        },
        managersOfGuild: guildID => { // This is a SET. Members that have been checked and cached and have permissions
          if (!guildID) throw new TypeError('Guild ID must be provided')
          return `drss_guild_${guildID}_managers`
        }
      },
      JSON_KEYS: ['guildID', 'isManager'],
      recognize: async (redisClient, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        await promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.membersOfGuild(member.guild.id), member.id)
        // await promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.guildsOf(member.id), member.guild.id)
        if (member.permissions.has(MANAGE_CHANNELS_PERM)) return GuildMember.utils.recognizeManager(member.guild)
      },
      recognizeManual: async (redisClient, userID, guildID) => {
        // A manual function is needed when the member is not cached, and they're retrieved from Discord's REST API instead
        if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
        return promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.membersOfGuild(guildID), userID)
      },
      recognizeNonMember: async (redisClient, userID, guildID) => {
        // This is used to to record users who are not part of this guild, for authentication purposes
        if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
        return promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.nonMembersOfGuild(guildID), userID)
      },
      recognizeTransaction: (multi, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        multi.sadd(this.utils.REDIS_KEYS.membersOfGuild(member.guild.id), member.id)
        // multi.sadd(this.utils.REDIS_KEYS.guildsOf(member.id), member.guild.id)
        if (member.hasPermission(MANAGE_CHANNELS_PERM)) multi.sadd(this.utils.REDIS_KEYS.managersOfGuild(member.guild.id), member.id)
      },
      recognizeManager: async (redisClient, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        return promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.managersOfGuild(member.guild.id), member.id)
      },
      recognizeManagerManual: async (redisClient, userID, guildID) => {
        // This does not add to the regular members set of the guild
        if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
        return promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.managersOfGuild(guildID), userID)
      },
      forgetManager: async (redisClient, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        return promisify(redisClient.srem).bind(redisClient)(this.utils.REDIS_KEYS.managersOfGuild(member.guild.id), member.id)
      },
      // addNonManager: async (redisClient, userID, guildID) => {
      //   if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
      //   return promisify(redisClient.sadd).bind(redisClient)(this.utils.REDIS_KEYS.notmanagersOfGuild(guildID), userID)
      // },
      forget: async (redisClient, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        return new Promise((resolve, reject) => {
          redisClient.multi()
            .srem(this.utils.REDIS_KEYS.membersOfGuild(member.guild.id), member.id)
            .srem(this.utils.REDIS_KEYS.managersOfGuild(member.guild.id), member.id)
            // .del(this.utils.REDIS_KEYS.guildsOf(member.id))
            .exec((err, res) => err ? reject(err) : resolve(res))
        })
      },
      forgetTransaction: (multi, member) => {
        if (!(member instanceof Discord.GuildMember)) throw new TypeError('Member is not instance of Discord.GuildMember')
        multi.srem(this.utils.REDIS_KEYS.membersOfGuild(member.guild.id), member.id)
        multi.srem(this.utils.REDIS_KEYS.managersOfGuild(member.guild.id), member.id)
        // multi.del(this.utils.REDIS_KEYS.guildsOf(member.id))
      },
      isMemberOfGuild: async (redisClient, memberID, guildID) => {
        if (!memberID || !guildID) throw new TypeError('User or guild ID is not defined')
        return promisify(redisClient.sismember).bind(redisClient)(this.utils.REDIS_KEYS.membersOfGuild(guildID), memberID)
      },
      isManagerOfGuild: async (redisClient, userID, guildID) => {
        if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
        return promisify(redisClient.sismember).bind(redisClient)(this.utils.REDIS_KEYS.managersOfGuild(guildID), userID)
      }// ,
      // isNotManagerOfGuild: async (redisClient, userID, guildID) => {
      //   if (!userID || !guildID) throw new TypeError('User or guild ID is not defined')
      //   return promisify(redisClient.sismember).bind(redisClient)(this.utils.REDIS_KEYS.notmanagersOfGuild(guildID), userID)
      // }
    }
  }
}

module.exports = GuildMember
