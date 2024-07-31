import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Client, Account, ID, Databases } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import RNRestart from 'react-native-restart';


const setObj = async (key, value) => { try { const jsonValue = JSON.stringify(value); await AsyncStorage.setItem(key, jsonValue) } catch (e) { console.log(e) } }
const setPlain = async (key, value) => { try { await AsyncStorage.setItem(key, value) } catch (e) { console.log(e) } }
const get = async (key) => { try { const value = await AsyncStorage.getItem(key); if (value !== null) { try { return JSON.parse(value) } catch { return value } } } catch (e) { console.log(e) } }
const delkey = async (key, value) => { try { await AsyncStorage.removeItem(key) } catch (e) { console.log(e) } }
const getAll = async () => { try { const keys = await AsyncStorage.getAllKeys(); return keys } catch (error) { console.error(error) } }


let client;
let account;
let sessId;
let db;

get('sessId').then((value) => {
  console.log(value)
  sessId = value;
});

client = new Client();
client
  .setEndpoint('https://appwrite.shuchir.dev/v1')
  .setProject('wheresmyflight')
  .setPlatform('dev.shuchir.wmfwear');

account = new Account(client);
db = new Databases(client);

export default function App() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [form, setForm] = React.useState(null);

  React.useEffect(() => {
    get('sessId').then((value) => {
      console.log(value)
      sessId = value;
      forceUpdate();
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
      account.createEmailPasswordSession(email, password)
      .then((res) => {
        account.get().then(details => {
          console.log("DETAILS", details)
          setPlain("sessId", details['$id'])
          sessId = details['$id']
          RNRestart.restart();
        })
      })
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

  if (sessId) {
    db.listDocuments("data", "flights").then((res) => {
      console.log(res)
    })
  }

  return (
    <View style={styles.container}>
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
    {sessId &&
    <View style={styles.container}>
      <Text style={styles.text}>Welcome back!</Text>
    </View>
    }

    <Toast config={toastConfig} />
    </View>
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
  }
});
