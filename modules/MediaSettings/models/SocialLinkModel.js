/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

import mongoose from 'mongoose'

const LinkSchema = new mongoose.Schema(
  {
    link: { type: String, required: true }
  },
  { _id: true }
)

const SocialLinkSchema = new mongoose.Schema({
  title: String,
  description: String,
  link: [LinkSchema]
})

const SocialLinks = mongoose.model('SocialLink', SocialLinkSchema)

export default SocialLinks
