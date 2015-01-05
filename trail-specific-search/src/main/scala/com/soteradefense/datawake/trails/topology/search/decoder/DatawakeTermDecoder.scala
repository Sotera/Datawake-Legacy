package com.soteradefense.datawake.trails.topology.search.decoder

import com.soteradefense.datawake.trails.topology.search.data.DatawakeTerm
import kafka.serializer.Decoder
import org.slf4j.{Logger, LoggerFactory}

class DatawakeTermDecoder extends Decoder[DatawakeTerm] with Serializable {
  val logger: Logger = LoggerFactory.getLogger(classOf[DatawakeTermDecoder])

  override def fromBytes(bytes: Array[Byte]): DatawakeTerm = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes, "utf-8")
    val data = str.split("\u0000")
    logger.info("Parsed DatawakeTerm: {}", str)
    if (data == null || data.length != 5)
      return null
    new DatawakeTerm(data(0), data(1), data(2), data(3), data(4).toBoolean)
  }
}
