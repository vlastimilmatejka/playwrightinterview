export const getAllProductListSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["responseCode", "products"],
  "properties": {
    "responseCode": {
      "type": "integer"
    },
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "price", "brand", "category"],
        "properties": {
          "id": {
            "type": "integer"
          },
          "name": {
            "type": "string"
          },
          "price": {
            "type": "string",
            "pattern": "^Rs\\.\\s\\d+$"
          },
          "brand": {
            "type": "string"
          },
          "category": {
            "type": "object",
            "required": ["usertype", "category"],
            "properties": {
              "usertype": {
                "type": "object",
                "required": ["usertype"],
                "properties": {
                  "usertype": {
                    "type": "string",
                    "enum": ["Men", "Women", "Kids"]
                  }
                }
              },
              "category": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}

export const loginNoParametersSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Generated schema for Root",
  "type": "object",
  "properties": {
    "responseCode": {
      "type": "number"
    },
    "message": {
      "type": "string"
    }
  },
  "required": [
    "responseCode",
    "message"
  ]
}