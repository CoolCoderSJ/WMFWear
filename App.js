import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { Client, Account, ID, Databases } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import RNRestart from 'react-native-restart';
import axios from 'axios';
import {
  LineChart,
} from "react-native-chart-kit";

import { Dimensions } from "react-native";
const screenWidth = Dimensions.get("window").width;

const setObj = async (key, value) => { try { const jsonValue = JSON.stringify(value); await AsyncStorage.setItem(key, jsonValue) } catch (e) { console.log(e) } }
const setPlain = async (key, value) => { try { await AsyncStorage.setItem(key, value) } catch (e) { console.log(e) } }
const get = async (key) => { try { const value = await AsyncStorage.getItem(key); if (value !== null) { try { return JSON.parse(value) } catch { return value } } } catch (e) { console.log(e) } }
const delkey = async (key, value) => { try { await AsyncStorage.removeItem(key) } catch (e) { console.log(e) } }
const getAll = async () => { try { const keys = await AsyncStorage.getAllKeys(); return keys } catch (error) { console.error(error) } }


let client;
let account;
let sessId;
let db;
let f;
let sdt, edt, sat, eat, adt, aat, sData, aData;

const chartConfig = {
  backgroundGradientFrom: "#1E2923",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#08130D",
  backgroundGradientToOpacity: 0.5,
  color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
  strokeWidth: 2, // optional, default 3
  barPercentage: 0.5,
  useShadowColorFromDataset: false // optional
};

get('sessId').then((value) => {
  console.log(value)
  sessId = value;
});

client = new Client();
client
  .setEndpoint('https://appwrite.shuchir.dev/v1')
  .setProject('wheresmyflight')
  .setPlatform('dev.shuchir.wheresmyflight');

get('sessToken').then((value) => {
  console.log(value)
  client.setSession(value);
})

account = new Account(client);
db = new Databases(client);

let flights = [];

export default function App() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [form, setForm] = React.useState(null);
  const [flightPage, setFlightPage] = React.useState(false);

  React.useEffect(() => {
    get('sessId').then((value) => {
      console.log(value)
      sessId = value;
      forceUpdate();

      if (sessId) {
        db.listDocuments("data", "flights").then((res) => {
          flights = res.documents.reverse();
          forceUpdate();
        })
      }

    })
  }, [])

  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{ width: 150 }}
        contentContainerStyle={{ width: 150 }}
      />
    ),

    error: (props) => (
      <ErrorToast
        {...props}
        style={{ width: 150 }}
        contentContainerStyle={{ width: 150 }}
      />
    ),

    info: (props) => (
      <InfoToast
        {...props}
        style={{ width: 150 }}
        contentContainerStyle={{ width: 150 }}
      />
    )
  };

  BackHandler.addEventListener('hardwareBackPress', function () {
    if (flightPage) {
      setFlightPage(false);
      return true;
    }
    return false;
  })

  const loginFunc = async () => {
    let email = form.username;  
    let password = form.password;
    console.log(email, password)

    Toast.show({
      type: 'info',
      text1: "Logging in...",
      autoHide: false
    })

    let newSignup = false;

    try {
      await account.create(ID.unique(), email, password);
      newSignup = true;
    }
    catch {}

    try { 
      let data = JSON.stringify({
        "email": email,
        "password": password
      });
      
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://appwrite.shuchir.dev/v1/account/sessions/email',
        headers: { 
          'X-Appwrite-Response-Format': '1.5.5', 
          'X-Appwrite-Project': 'wheresmyflight', 
          'Content-Type': 'application/json', 
        },
        data : data
      };
      
      let res = await axios.request(config)
      console.log(res.headers['set-cookie'])
      let cookies = res.headers['set-cookie']
      let session = cookies[0].split(";")[0]
      let key = session.split("=")[0]
      let value = session.split("=")[1]
      console.log(key, value)

      setPlain("sessToken", value)

      client.setSession(value)
      let details = await account.get()
      console.log("DETAILS", details)
      setPlain("sessId", details['$id'])
      sessId = details['$id']
      RNRestart.restart();
    }
    catch (err) {
      console.log(err)
      Toast.show({
        type: 'error',
        text1: "Error",
        text2: err,
        autoHide: false
      })
    }
  }

  return (
    <ScrollView contentContainerStyle={{ backgroundColor: "#000" }}>
    {!sessId &&
    <View style={{...styles.container, marginTop: 10}}>
      <Text style={{...styles.text, fontSize: 20}}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={"#ccc"}
        onChangeText={text => setForm({ ...form, username: text })}
        keyboardType="email-address"
        inputMode="email"
        textContentType="emailAddress"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={"#ccc"}
        onChangeText={text => setForm({ ...form, password: text })}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          loginFunc()
        }}
      >
        <Text style={styles.text}>Login</Text>
      </TouchableOpacity>
    </View>
    }
    {sessId && !flightPage &&
    <ScrollView contentContainerStyle={{ paddingVertical: 50, paddingLeft: 10 }}>
      {flights.map((flight, index) => {
        let dep, arr, schedDep, schedArr;

        schedDep = new Date(Date.parse(flight.scheduledTime[0])).toUTCString().split(":00 GMT ")[0].split(" ")[4].slice(0, 5)
        schedArr = new Date(Date.parse(flight.scheduledTime[1])).toUTCString().split(":00 GMT ")[0].split(" ")[4].slice(0, 5)
        if (flight.time[0]) dep = new Date(Date.parse(flight.time[0])).toUTCString().split(":00 GMT ")[0].split(" ")[4].slice(0, 5)
        if (flight.time[1]) arr = new Date(Date.parse(flight.time[1])).toUTCString().split(":00 GMT ")[0].split(" ")[4].slice(0, 5)
        if (flight.scheduledTime[0] && !flight.time[0]) { flight.time[0] = flight.scheduledTime[0]; dep = schedDep }
        if (flight.scheduledTime[1] && !flight.time[1]) { flight.time[1] = flight.scheduledTime[1]; arr = schedArr }

        function tConvert (time) {
          // Check correct time format and split into components
          time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
  
          if (time.length > 1) { // If time format correct
            time = time.slice (1);  // Remove full string match value
            time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
            time[0] = +time[0] % 12 || 12; // Adjust hours
          }
          return time.join (''); // return adjusted time or original string
        }
  
        try {dep = tConvert(dep)}
        catch {console.log("could not get tz for dep")}
        try {arr = tConvert(arr)}
        catch {console.log("could not get tz for arr")} 
        try {schedDep = tConvert(schedDep)}
        catch {console.log("could not get tz for scheddep")}
        try {schedArr = tConvert(schedArr)}
        catch {console.log("could not get tz for schedarr")}

        
        let depDiffNum = (new Date(Date.parse(flight.time[0])).getTime() - new Date(Date.parse(flight.scheduledTime[0])).getTime()) / 60000;
        let depDiffText = ""
        if (depDiffNum < 0) {
          depDiffNum *= -1;
          depDiffText = "early"
        }
        else {
          depDiffText = "late"
        }
        let depDiff = depDiffNum%60 + "min";
        if (Math.floor(depDiffNum/60) > 0) {
          depDiff = Math.floor(depDiffNum/60) + "hr " + depDiff
        }
        if (depDiffNum == 0) {
          depDiff = "on time"
          depDiffText = ""
        }
  
        let arrDiffNum = (new Date(Date.parse(flight.time[1])).getTime() - new Date(Date.parse(flight.scheduledTime[1])).getTime()) / 60000;
        let arrDiffText = ""
        if (arrDiffNum < 0) {
          arrDiffNum *= -1;
          arrDiffText = "early"
        }
        else {
          arrDiffText = "late"
        }
        let arrDiff = arrDiffNum%60 + "min";
        if (Math.floor(arrDiffNum/60) > 0) {
          arrDiff = Math.floor(arrDiffNum/60) + "hr " + arrDiff
        }
        if (arrDiffNum == 0) {
          arrDiff = "on time"
          arrDiffText = ""
        }

        return (
          <TouchableOpacity key={index} style={styles.outer} onPress={() => {
            f = flight; 
            sdt = f.fullData[19] ? f.fullData[19].replace("Z", "") : "";
            edt = f.fullData[20] ? f.fullData[20].replace("Z", "") : "";
            sat = f.fullData[22] ? f.fullData[22].replace("Z", "") : "";
            eat = f.fullData[23] ? f.fullData[23].replace("Z", "") : "";
            adt = f.fullData[21] ? f.fullData[21].replace("Z", "") : "";
            aat = f.fullData[24] ? f.fullData[24].replace("Z", "") : "";

            sData = {
              labels: [],
              datasets: [
                {
                  data: JSON.parse(f.speed),
                }
              ],
            };

            for (let i = 0; i < JSON.parse(f.speed).length; i++) {
              sData.labels.push(i)
            }

            aData = {
              labels: [],
              datasets: [
                {
                  data: JSON.parse(f.altitude),
                }
              ],
            };

            for (let i = 0; i < JSON.parse(f.altitude).length; i++) {
              aData.labels.push(i)
            }
            setFlightPage(true)
            }}>
            <View style={styles.left}>
              <Text style={styles.text}>{flight.flightId}</Text>
              <Text style={{...styles.text, ...styles.bigger}}>{flight.airport[0]}</Text>
              <Text style={{...styles.text, color: depDiffText == 'late' ? 'red' : '#90EE90'}}>{dep}</Text>
              <Text style={{...styles.text, ...styles.smaller}}>{flight.gate[0] ? 'Gate '+flight.gate[0] : ""}</Text>
            </View>
            <View style={styles.right}>
              <Text style={{...styles.text, textAlign: "right"}}>{new Date(flight.scheduledTime[0].split("+")[0]).toDateString().split(" ").splice(1,2).join(" ")}</Text>
              <Text style={{...styles.text, ...styles.bigger, textAlign: "right"}}>{flight.airport[1]}</Text>
              <Text style={{...styles.text, color: arrDiffText == 'late' ? 'red' : '#90EE90', textAlign: "right"}}>{arr}</Text>
              <Text style={{...styles.text, ...styles.smaller, textAlign: "right"}}>{flight.gate[1] ? 'Gate '+flight.gate[1] : ""}</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
    }

      {sessId && flightPage &&
          <ScrollView contentContainerStyle={{ paddingVertical: 50, paddingLeft: 10 }}>

            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Aircraft</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[0]}</Text>
            </View>

            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Airline</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[1]}</Text>
            </View>

            <Text style={{...styles.text, ...styles.heading, marginTop: 12, marginLeft: 5 }}>Departure</Text>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Timezone</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[2]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Airport</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[3].split(" (")[0]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>City</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[4]}</Text>
            </View>

            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Sched. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{sdt ? (new Date(Date.parse(sdt)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(sdt)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Est. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{edt ? (new Date(Date.parse(edt)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(edt)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Act. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{adt ? (new Date(Date.parse(adt)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(adt)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Runway</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.runwayTimes[0]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[5]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Terminal</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[6]}</Text>
            </View>



            <Text style={{...styles.text, ...styles.heading, marginTop: 12, marginLeft: 5 }}>Arrival</Text>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Timezone</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[7]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Airport</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[8].split(" (")[0]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>City</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[9]}</Text>
            </View>

            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Sched. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{sat ? (new Date(Date.parse(sat)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(sat)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Est. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{eat ? (new Date(Date.parse(eat)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(eat)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Act. Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{aat ? (new Date(Date.parse(aat)).toLocaleTimeString().split(" ")[0].split(":").splice(0, 2)).join(":") + " " + new Date(Date.parse(aat)).toLocaleTimeString().split(" ")[1] : "N/A"}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Runway</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.runwayTimes[1]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Gate</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[10]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Terminal</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[11]}</Text>
            </View>

            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Baggage Claim</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.baggageClaim}</Text>
            </View>




            <Text style={{...styles.text, ...styles.heading, marginTop: 12, marginLeft: 5 }}>Distance</Text>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Actual</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[12]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Planned</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[13]}</Text>
            </View>
            <View style={styles.outer2}>
              <Text style={{...styles.text, ...styles.heading}}>Taken</Text>
              <Text style={{...styles.text, textAlign: "right"}}>{f.fullData[14]}</Text>
            </View>


            <Text style={{...styles.text, ...styles.heading, marginTop: 12, marginLeft: 5 }}>Speed</Text>
            <LineChart
              data={sData}
              width={175}
              height={220}
              chartConfig={chartConfig}
              withDots={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              style={{
                marginLeft: 0,
                width: 150,
                paddingRight: 0,
                borderRadius: 16,
              }}
              bezier
              hideLegend={true}
            />

            <Text style={{...styles.text, ...styles.heading, marginTop: 12, marginLeft: 5 }}>Altitude</Text>
            <LineChart
              data={aData}
              width={175}
              height={220}
              chartConfig={chartConfig}
              withDots={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              style={{
                marginLeft: 0,
                width: 150,
                paddingRight: 0,
                borderRadius: 16,
              }}
              bezier
              hideLegend={true}
            />
            
          </ScrollView>
      }

    <Toast config={toastConfig} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    fontFamily: "Roboto",
    color: "#fff",
  },
  input: {
    height: 35,
    marginVertical: 5,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    width: 150,
    fontSize: 14,
    color: "#fff",
    borderColor: "#3a3a3a",
    fontFamily: "Roboto",
  },

  button: {
    backgroundColor: "#3a3a3a",
    padding: 10,
    borderRadius: 8,
    width: 150,
    alignItems: "center",
    marginVertical: 5,
  },

  outer: {
    padding: 10,
    borderRadius: 8,
    width: 175,
    alignItems: "center",
    marginVertical: 5,
    flexDirection: "row"
  },

  outer2: {
    paddingHorizontal: 10,
    borderRadius: 8,
    width: 175,
    alignItems: "center",
    marginVertical: 2,
    flexDirection: "row",
    gap: 10
  },

  left: {
    flex: 1
  },

  right: {
    flex: 1,
    textAlign: "right"
  },

  bigger: {
    fontSize: 20,
    fontWeight: "bold"
  },

  smaller: {
    fontSize: 12
  },

  heading: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#9fc6ff"
  }

});
