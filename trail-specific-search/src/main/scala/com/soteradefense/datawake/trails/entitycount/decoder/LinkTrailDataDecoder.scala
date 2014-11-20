package com.soteradefense.datawake.trails.entitycount.decoder

import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.entitycount.data.{LinkTrailData, LinkTrailDataHelper}
import kafka.serializer.Decoder
import net.liftweb.json._

class LinkTrailDataDecoder extends Decoder[LinkTrailData] with Serializable {
  override def fromBytes(bytes: Array[Byte]): LinkTrailData = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    implicit val formats = DefaultFormats
    val jValue = JsonParser.parse(str)
    val appid = jValue.extract[AppIdHelper]
    if (appid.appid.equals(DatawakeConstants.APPID)) {
      val results = jValue.extract[LinkTrailDataHelper]
      println("Updating: " + results.attrs.term)
      new LinkTrailData(results.attrs.org, results.attrs.domain, results.attrs.trail, results.attrs.term, results.url, results.raw_html, results.attrs.title)
    } else {
      null
    }
  }
}