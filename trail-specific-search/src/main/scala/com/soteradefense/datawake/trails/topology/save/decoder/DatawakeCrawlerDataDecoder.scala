package com.soteradefense.datawake.trails.topology.save.decoder

import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.topology.save.data.{AppIdHelper, DatawakeCrawlerData, DatawakeCrawlerDataHelper}
import kafka.serializer.Decoder
import net.liftweb.json._

class DatawakeCrawlerDataDecoder extends Decoder[DatawakeCrawlerData] with Serializable {
  override def fromBytes(bytes: Array[Byte]): DatawakeCrawlerData = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    implicit val formats = DefaultFormats
    val jValue = JsonParser.parse(str)
    val appid = jValue.extract[AppIdHelper]
    if (appid.appid.equals(DatawakeConstants.APPID)) {
      val results = jValue.extract[DatawakeCrawlerDataHelper]
      println(results.url)
      new DatawakeCrawlerData(results.attrs.org, results.attrs.domain, results.attrs.trail, results.url, results.raw_html, results.attrs.title)
    } else {
      null
    }
  }
}