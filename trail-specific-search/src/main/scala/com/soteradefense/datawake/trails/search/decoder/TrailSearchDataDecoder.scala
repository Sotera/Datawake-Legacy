package com.soteradefense.datawake.trails.search.decoder

import com.soteradefense.datawake.trails.search.data.TrailSearchData
import kafka.serializer.Decoder

class TrailSearchDataDecoder extends Decoder[TrailSearchData] with Serializable {
  override def fromBytes(bytes: Array[Byte]): TrailSearchData = {
    if (bytes == null || bytes.length == 0)
      return null
    val str = new String(bytes)
    val data = str.split("\u0000")
    println(str)
    if (data == null || data.length != 4)
      return null
    new TrailSearchData(data(0), data(1), data(2), data(3))
  }
}
