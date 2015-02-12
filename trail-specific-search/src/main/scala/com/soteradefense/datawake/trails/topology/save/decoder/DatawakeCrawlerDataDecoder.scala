package com.soteradefense.datawake.trails.topology.save.decoder

import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.topology.save.data.{AppIdHelper, DatawakeCrawlerData, DatawakeCrawlerDataHelper}
import kafka.serializer.Decoder
import net.liftweb.json._
import org.slf4j.{Logger, LoggerFactory}

class DatawakeCrawlerDataDecoder extends Decoder[DatawakeCrawlerData] with Serializable {
  val logger: Logger = LoggerFactory.getLogger(classOf[DatawakeCrawlerDataDecoder])

  override def fromBytes(bytes: Array[Byte]): DatawakeCrawlerData = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    implicit val formats = DefaultFormats
    try {
      val jValue = JsonParser.parse(str)
      val appid = jValue.extract[AppIdHelper]
      if (appid.appid.equals(DatawakeConstants.APP_ID)) {
        try {
          val results = jValue.extract[DatawakeCrawlerDataHelper]
          logger.info("Crawled: {}", results.url)
          logger.info("Title: {}", results.attrs.title)
          new DatawakeCrawlerData(results.attrs.org, results.attrs.domain, results.attrs.trail, results.url, results.body, results.attrs.title, results.attrs.rank)
        } catch {
          case _: Throwable =>
            null
        }
      } else {
        null
      }
    } catch {
      case e: Throwable => {
        logger.error("Error decoding message.",e)
        null
      }
    }
  }
}
