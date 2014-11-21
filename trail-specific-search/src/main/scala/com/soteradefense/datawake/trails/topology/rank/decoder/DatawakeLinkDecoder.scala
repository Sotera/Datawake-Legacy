package com.soteradefense.datawake.trails.topology.rank.decoder

import com.soteradefense.datawake.trails.topology.rank.data.DatawakeLink
import kafka.serializer.Decoder

class DatawakeLinkDecoder extends Decoder[DatawakeLink] with Serializable {
  override def fromBytes(bytes: Array[Byte]): DatawakeLink = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    val entityValues = str.split("\u0000")
    if(entityValues == null || entityValues.length != 4)
      return null
    println(str)
    new DatawakeLink(entityValues(0), entityValues(1), entityValues(2), entityValues(3))
  }
}
