package com.soteradefense.datawake.trails.data

import backtype.storm.tuple.Values

trait StormData {
  def toValues: Values
}
