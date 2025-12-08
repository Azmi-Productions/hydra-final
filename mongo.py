import paho.mqtt.client as mqtt
import json
import random
import time
from datetime import datetime
import pytz
from pymongo import MongoClient

# Define MQTT settings
mqtt_broker = "202.129.164.202"  # Replace with your broker address
mqtt_port = 1883  # Default MQTT port
mqtt_topicstatus = "tboxdata/data"  # Single topic to fetch the array

# MQTT authentication credentials
mqtt_username = "mqtt"  # Replace with your username
mqtt_password = "pa$$w0rd"  # Replace with your password

# MongoDB setup
mongo_client = MongoClient("mongodb+srv://azp:CrestTbox123.@azpclusters.jwyeh8n.mongodb.net/Tbox")  # Replace with your MongoDB connection string if needed
db = mongo_client["Tbox"]  # Database name
vehicle_collection = db["vehicle"]  # Collection name

# Create an MQTT client instance
client = mqtt.Client()

# Set the username and password for the MQTT client
client.username_pw_set(mqtt_username, mqtt_password)


# Define the callback function for when the client connects to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
        # Subscribe to the topic once connected
        client.subscribe(mqtt_topicstatus)
    else:
        print(f"Failed to connect, return code {rc}")


# Define the callback function for when a message is received
def on_message(client, userdata, msg):
    try:
        # Parse the received payload as JSON
        payload = json.loads(msg.payload.decode())

        # Insert the received data into MongoDB (vehicle collection)
        result = vehicle_collection.insert_one(payload)
        print(f"Data inserted with ID: {result.inserted_id}")

    except Exception as e:
        print(f"Error processing message: {e}")


# Assign the callback functions
client.on_connect = on_connect
client.on_message = on_message

# Connect to the MQTT broker
client.connect(mqtt_broker, mqtt_port, 60)

# Start the MQTT client loop
client.loop_start()

try:
    while True:
        # The client loop is running and handling messages
        time.sleep(2)  # Delay to keep the script alive

except KeyboardInterrupt:
    print("Stopping script...")

finally:
    # Stop the MQTT client loop and disconnect from the broker
    client.loop_stop()
    client.disconnect()
