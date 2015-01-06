package com.soteradefense.datawake.trails.data

import backtype.storm.tuple.Values

/**
 * Interface for defining a class that is read from kafka and converting to storm readable data.
 */
trait StormData {
  def toValues: Values
}
