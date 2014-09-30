(ns test1
  (:use     [streamparse.specs])
  (:gen-class))

(defn test1 [options]
   [
    ;; spout configuration
    {"datawake-visited-spout" (python-spout-spec
          options
          "spouts.datawake_spouts.DatawakeVisitedSpout"
           ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
          )


   "kafka-datawake-visited-spout" (python-spout-spec
           options
          "spouts.kafka_spouts.KafkaDatawakeVisitedSpout"
           ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
          )
    }

    ;; bolt configuration
    {
    "email-bolt" (python-bolt-spec
        options
        {"datawake-visited-spout" :shuffle "kafka-datawake-visited-spout" :shuffle}
        "bolts.extractors.email_bolt.EmailBolt"
        ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

        )

    "phone-bolt" (python-bolt-spec
        options
        {"datawake-visited-spout" :shuffle "kafka-datawake-visited-spout" :shuffle}
        "bolts.extractors.phone_bolt.PhoneBolt"
        ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

        )

    "website-bolt" (python-bolt-spec
        options
        {"datawake-visited-spout" :shuffle "kafka-datawake-visited-spout" :shuffle}
         "bolts.extractors.website_bolt.WebsiteBolt"
        ["attribute", "value", "extracted_raw", "extracted_metadata","context"]

        )


    "writer-bolt" (python-bolt-spec
               options
               {"email-bolt" :shuffle
               "phone-bolt" :shuffle
               "website-bolt" :shuffle }
               "bolts.writer_bolt.FileWriterBolt"
               []
               :p 1
               )

    }

  ]
)
