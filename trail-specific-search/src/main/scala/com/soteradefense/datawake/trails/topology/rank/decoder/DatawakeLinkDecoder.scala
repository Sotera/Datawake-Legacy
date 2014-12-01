package com.soteradefense.datawake.trails.topology.rank.decoder

import com.soteradefense.datawake.trails.topology.rank.data.DatawakeLink
import kafka.serializer.Decoder
import org.slf4j.{LoggerFactory, Logger}

class DatawakeLinkDecoder extends Decoder[DatawakeLink] with Serializable {
  val logger: Logger = LoggerFactory.getLogger(classOf[DatawakeLinkDecoder])

  override def fromBytes(bytes: Array[Byte]): DatawakeLink = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    val entityValues = str.split("\u0000")
    if(entityValues == null || entityValues.length != 4)
      return null
    logger.info("Updating Rank For Entity: {}", str)
    new DatawakeLink(entityValues(0), entityValues(1), entityValues(2), entityValues(3))
  }
}
