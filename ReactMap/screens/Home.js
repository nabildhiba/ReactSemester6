/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Text } from '../components/Text';
import colors from '../constant/colors.json';
import { showMessage } from 'react-native-flash-message';
import SearchBar from '../components/SearchBar';
import AppCheckbox from '../components/AppCheckbox';
import Spinner from '../components/Spinner';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Picker } from '@react-native-picker/picker';
import IIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, formatDistanceToNow } from 'date-fns';
import { getLocation } from '../Utils/requestLocationPermission';
import getDistanceFromLatLon from '../Utils/getDistanceFromLatLon';
import notifee from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import Geolocation from 'react-native-geolocation-service';
import moment from 'moment';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import RNLocation from 'react-native-location';
import { uniqBy } from 'lodash';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import {
  TourGuideProvider, // Main provider
  TourGuideZone, // Main wrapper of highlight component
  TourGuideZoneByPosition, // Component to use mask on overlay (ie, position absolute)
  useTourGuideController, // hook to start, etc.
} from 'rn-tourguide'
const GLOBAL = require('../Utils/Global');

const milesArray = [
  0.0310685596, 0.0621371192, 0.1242742384, 0.1864113577, 0.2485484769,
];


// notifee.onBackgroundEvent(async ({type, detail}) => {
//   // const {notification, pressAction} = detail;
//   // Check if the user pressed the "Mark as read" action
//   // if (type === EventType.ACTION_PRESS && pressAction.id === 'mark-as-read') {
//   //   // Update external API
//   //   await fetch(`https://my-api.com/chat/${notification.data.chatId}/read`, {
//   //     method: 'POST',
//   //   });
//   //   // Remove the notification
//   //   await notifee.cancelNotification(notification.id);
//   // }
// });

// const requestBackgroundLocationPermission = async () => {
//   try {
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
//       {
//         title: 'Allow Location Access',
//         message:
//           'App needs to access your backgroud location to alert you when you are near a location, your location will not be stored online/offline',
//         buttonNeutral: 'Ask Me Later',
//         buttonNegative: 'Cancel',
//         buttonPositive: 'OK',
//       },
//     );
//     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
//       console.log('You can use the background location');
//     } else {
//       console.log('Background location permission denied');
//     }
//   } catch (err) {
//     console.warn(err);
//   }
// };

const DistanceAlarmCard = ({
  distanceCheckbox,
  setDistanceCheckbox,
  selectDistance,
  setSelectDistance,
}) => {
  // const [toggleCheckBox, setToggleCheckBox] = useState(false);
  // const [selectDistance, setSelectDistance] = useState(2);
  const pickerRef = useRef(null);
  return (
    <LinearGradient
      colors={['#4292C5', '#1FAB86']}
      style={{
        height: 80,
        flexDirection: 'row',
        backgroundColor: '#319EA7',
        padding: 5,
        borderRadius: 5,
        marginBottom: 10,
      }}>
      <View style={{ flex: 0.1 }}>
        <AppCheckbox
          value={distanceCheckbox}
          onValueChange={newValue => {
            // console.log(newValue)
            // setDistanceCheckbox(newValue)
          }}
          style={{ margin: 5 }}
        />
      </View>
      <View style={{ flex: 0.9 }}>
        <Text style={styles.text}>Distance Alarm</Text>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: 'row',
          }}>
          <Text style={styles.text}>Distance:</Text>
          <TouchableOpacity
            onPress={() => pickerRef.current.focus()}
            style={{ flexDirection: 'row' }}>
            <Text style={styles.text}>{`${Math.round(
              selectDistance * 1609.344,
            )} meter(s)`}</Text>
            <IIcon
              name="chevron-down"
              size={20}
              color="#fff"
              style={{ position: 'relative', top: 5, right: 2 }}
            />
            <Picker
              style={{ flex: 1, zIndex: 55555 }}
              dropdownIconColor="#2BA29D"
              ref={pickerRef}
              selectedValue={selectDistance}
              onValueChange={itemValue => setSelectDistance(itemValue)}>
              {milesArray.map(item => {
                return (
                  <Picker.Item
                    key={`${Math.round(item * 1609.344)} meter(s)`}
                    label={`${Math.round(item * 1609.344)} meter(s)`}
                    value={item}
                  />
                );
              })}
            </Picker>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const TimeAlarmCard = ({
  date,
  setDate,
  time,
  setTime,
  endTime,
  timeCheckbox,
  setTimeCheckbox,
  setEndTime,
}) => {
  // const [date, setDate] = useState(new Date());
  // const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDate(Platform.OS === 'ios');
    setDate(currentDate);
  };
  const onChangeTime = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowTime(Platform.OS === 'ios');
    setTime(currentDate);
  };

  const onChangeEndTime = (event, selectedDate) => {
    if (moment(time).diff(selectedDate, 'minutes') > 0) {
      setShowEndTime(Platform.OS === 'ios');
      showMessage({
        message: 'End Time can not be less then start time',
        type: 'danger',
      });
      return;
    }
    const currentDate = selectedDate || date;
    setShowEndTime(Platform.OS === 'ios');
    setEndTime(currentDate);
  };

  return (
    <LinearGradient
      colors={['#4292C5', '#1FAB86']}
      style={{
        // height: 80,
        flexDirection: 'row',
        backgroundColor: '#319EA7',
        padding: 5,
        borderRadius: 5,
        marginBottom: 10,
      }}>
      <View style={{ flex: 0.1 }}>
        <AppCheckbox
          value={timeCheckbox}
          onValueChange={newValue => setTimeCheckbox(newValue)}
          style={{ margin: 5 }}
        />
      </View>
      <View style={{ flex: 0.9 }}>
        <Text style={styles.text}>Time Alarm</Text>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: 'row',
            alignItems: 'center',
            // marginVertical: -10
          }}>
          <Text style={styles.text}>Date:</Text>
          <TouchableOpacity
            onPress={() => setShowDate(true)}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.text}>{format(date, 'd-M-y')}</Text>
            <IIcon name="chevron-down" size={20} color="#fff" />
            {showDate && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode={'date'}
                minimumDate={new Date()}
                is24Hour={true}
                display="default"
                onChange={onChangeDate}
              />
            )}
          </TouchableOpacity>
        </View>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: 'row',
          }}>
          <Text style={styles.text}>Start Time:</Text>
          <TouchableOpacity
            onPress={() => setShowTime(true)}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.text}>{format(time, 'hh:mm a')}</Text>
            <IIcon name="chevron-down" size={20} color="#fff" />
            {showTime && (
              <DateTimePicker
                testID="dateTimePicker"
                value={time}
                mode={'time'}
                is24Hour={false}
                display="default"
                onChange={onChangeTime}
              />
            )}
          </TouchableOpacity>
        </View>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: 'row',
          }}>
          <Text style={styles.text}>End Time:</Text>
          <TouchableOpacity
            onPress={() => setShowEndTime(true)}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.text}>{format(endTime, 'hh:mm a')}</Text>
            <IIcon name="chevron-down" size={20} color="#fff" />
            {showEndTime && (
              <DateTimePicker
                testID="dateTimePicker"
                value={endTime}
                minimumDate={time}
                mode={'time'}
                is24Hour={false}
                display="default"
                onChange={onChangeEndTime}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};
const NotesCard = ({
  notes,
  setNotes
}) => {
  return (
    <LinearGradient
      colors={['#4292C5', '#1FAB86']}
      style={{
        // height: 80,
        flexDirection: 'row',
        backgroundColor: '#319EA7',
        padding: 5,
        borderRadius: 5,
        marginBottom: 10,
      }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>Notes</Text>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: 'row',
            alignItems: 'center',
            // marginVertical: -10
          }}>
          <TextInput onChangeText={setNotes} style={styles.text} placeholder="Put a note here (running errands? Chopping a coffee?"></TextInput>
          <TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};


// const NotificationViaCard = ({notificationVia, setNotificationVia}) => {
//   // const [notificationVia, setNotificationVia] = useState('App Notification');
//   const pickerRef = useRef(null);

//   return (
//     <LinearGradient
//       colors={['#4292C5', '#1FAB86']}
//       style={{
//         flexDirection: 'row',
//         backgroundColor: '#319EA7',
//         padding: 5,
//         borderRadius: 5,
//         marginBottom: 10,
//         alignItems: 'center',
//         // justifyContent: 'space-between',
//       }}>
//       <View style={{flex: 0.9}}>
//         <View
//           style={{
//             justifyContent: 'space-between',
//             flexDirection: 'row',
//             marginBottom: -20,
//             paddingHorizontal: 10,
//           }}>
//           <Text style={styles.text}>Notification via: </Text>
//           <TouchableOpacity
//             onPress={() => pickerRef.current.focus()}
//             style={{flexDirection: 'row'}}>
//             <Text style={styles.text}>{notificationVia}</Text>
//             <IIcon
//               name="chevron-down"
//               size={20}
//               color="#fff"
//               style={{position: 'relative', top: 5}}
//             />
//             <Picker
//               dropdownIconColor="#2BA29D"
//               ref={pickerRef}
//               selectedValue={notificationVia}
//               onValueChange={(itemValue, itemIndex) =>
//                 setNotificationVia(itemValue)
//               }>
//               <Picker.Item label="Notification" value={'push_notification'} />
//               <Picker.Item label="Email" value={'email'} enabled={false} />
//               <Picker.Item
//                 label="Ringtone"
//                 value={'ringtone'}
//                 enabled={false}
//               />
//             </Picker>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </LinearGradient>
//   );
// };

const SubmitButton = ({ onPress = () => null }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={['#4292C5', '#1FAB86']}
        style={{
          flexDirection: 'row',
          backgroundColor: '#319EA7',
          padding: 5,
          borderRadius: 5,
          marginBottom: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={styles.text}>Submit</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

function Home({ route, navigation }) {
  const [marker, setMarker] = useState(null);
  const rawSheetRef = useRef(null);
  const [selectDistance, setSelectDistance] = useState(milesArray[0]);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  // const [notificationVia, setNotificationVia] = useState('App Notification');
  const [distanceCheckbox, setDistanceCheckbox] = useState(true);
  const [timeCheckbox, setTimeCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const alarmRef = useRef([]);
  const [alarmData, setAlarmData] = useState([]);
  const firstTime = useRef(true);
  const mapRef = useRef(null);
  const [locationAlarmName, setLocationAlarm] = useState('');
  const [placeIdAlarm, setLocationPlaceIdAlarm] = useState('');
  

  const onStop = () => {
    // Make always sure to remove the task before stoping the service. and instead of re-adding the task you can always update the task.
    if (ReactNativeForegroundService.is_task_running(1234)) {
      ReactNativeForegroundService.remove_task(1234);
    }
    // Stoping Foreground service.
    return ReactNativeForegroundService.stop();
  };
  const { start } = useTourGuideController()

  React.useEffect(() => {
    start()
  }, [])
  const onStart = () => {
    // Checking if the task i am going to create already exist and running, which means that the foreground is also running.
    if (ReactNativeForegroundService.is_task_running(1234)) {
      return;
    }

    ReactNativeForegroundService.add_task(
      async () => {
        console.log(new Date());
        
        // Geolocation.watchPosition(position => {
        //   console.log(
        //     'watch position',
        //     position.coords.latitude,
        //     position.coords.longitude,
        //   );
        // });
      },
      {
        delay: 20000,
        onLoop: true,
        taskId: 1234,
        onError: e => console.log('Error logging:', e),
      },
    );
    // starting  foreground service.
    return ReactNativeForegroundService.start({
      id: 1234,
      title: 'Alert Service',
      message:
        'Your location is being used in background to notify you at a particular location.',
    });
  };

  async function onDisplayNotification(title, body, data = {}) {
    // Create a channel
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      sound: 'default',
    });

    // Display a notification
    await notifee.displayNotification({
      id: data.id,
      title,
      body,
      data: { ...data, link: 'erminder://Snooze' },
      android: {
        channelId,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
        showTimestamp: true,
        timestamp: new Date() - 3600,
        // smallIcon: 'name-of-a-small-icon', // optional, defaults to 'ic_launcher'.
      },
    });
  }

  const addDebugObject = object => {
    // const debugCollection = firestore().collection('debug');
    // debugCollection.add(object);
  };

  const performOperation = coords => {
    addDebugObject({
      type: 'current location',
      coords,
    });
    if (firstTime.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      firstTime.current = false;
    }
    alarmRef.current.forEach((item, i) => {
      // console.log('--------------',item)
      if (item.isActive && item.timeAlarm && item.distanceAlarm) {
        const distance = getDistanceFromLatLon(
          coords.latitude,
          coords.longitude,
          item.coordinate.latitude,
          item.coordinate.longitude,
        );
        // const timeDifference = Math.abs(
        //   differenceInMinutes(new Date(item.dateTime), new Date()),
        // );
        // console.log(4, timeDifference);
        if (
          item.time &&
          item.endTime &&
          distance <= item.distance &&
          new Date() >= new Date(item.time.toDate()) &&
          new Date() <= new Date(item.endTime.toDate())
        ) {
          onDisplayNotification(
            `Time alarm (${item.location}) - ${formatDistanceToNow(
              new Date(item.dateTime),
            )}`,
            `2 You are ${Math.round(distance * 1609.344)} meters away from ${item.location
            }`,
            { id: item.id },
          );
          alarmRef.current[i].isActive = false;
        }
      } else if (item.isActive && item.distanceAlarm) {
        if (item.snoozeTime && new Date() < new Date(item.snoozeTime)) {
          return;
        }
        const distance = getDistanceFromLatLon(
          coords.latitude,
          coords.longitude,
          item.coordinate.latitude,
          item.coordinate.longitude,
        );
        if (distance <= item.distance) {
          if (auth()?.currentUser?.uid) {
            firestore()
              .collection('Users')
              .doc(auth().currentUser.uid)
              .collection('Alarms')
              .doc(item.id)
              .update({ isActive: false });
          }
          onDisplayNotification(
            item.location,
            `You are ${Math.round(distance * 1609.344)} meters away from ${item.location
            }`,
            { id: item.id },
          );
          alarmRef.current[i].isActive = false;
        }
      }
    });
  };


  const onMapPress = e => {
    setMarker({
      coordinate: e.nativeEvent.coordinate,
    });
    rawSheetRef.current.open();
  };

  const onPoiClick = e => {
    setMarker({
      coordinate: e.nativeEvent.coordinate,
    });
    rawSheetRef.current.open();
  };

  const onSubmit = async () => {
    if (!distanceCheckbox) {
      showMessage({
        message: 'Distance alarm is mandatory',
        type: 'danger',
      });
      return;
    }
    function createAlarm(label, place_id=null) {
      const Alarms = firestore()
        .collection('Users')
        .doc(auth().currentUser.uid)
        .collection('Alarms');
      setLocationAlarm('');
      setLocationPlaceIdAlarm('');
      Alarms.add({
        distanceAlarm: distanceCheckbox,
        timeAlarm: timeCheckbox,
        date: date,
        time: time,
        endTime: endTime,
        notes: notes,
        coordinate: marker.coordinate,
        location: label,
        locationGooglePlaceId:place_id,
        distance: selectDistance,
        notificationVia: 'App Notification',
        dateTime: `${format(date, 'yyyy-MM-dd')}T${format(time, 'HH:mm:ss')}`,
        dateTimeFormatted: `${format(date, 'dd/MM/yyyy')} ${format(
          time,
          'HH:mm'
        )}`,
        isActive: true,
        createdAt: firestore.Timestamp.fromDate(new Date()),
      })
        .then(() => {
          setLoading(false);
          setTimeCheckbox(false);
          setMarker({});
          // setDistanceCheckbox(false);
          rawSheetRef.current.close();
          showMessage({
            message: 'Alarm have been added successfully.',
            type: 'success',
          });
        })
        .catch(err => {
          showMessage({
            message: err.toString(),
            type: 'danger',
          });
        });
    }

    if (auth()?.currentUser?.uid) {
      setLoading(true);
      if (locationAlarmName.length == 0) {
        resluts = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${marker.coordinate.latitude},${marker.coordinate.longitude}&key=${GLOBAL.MAPS_API_KEY}`,
        ).then(
          async resp => {
            // If no known place here => The alarm will be labeled unknown address
            if (resp.data?.results[0].place_id.length == 0) {
              createAlarm('Unknown address');
              return;
            }
            //From here: we find a unique Google place=> Label the alarm by the place.
            locationSearch = await axios.get(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${resp.data?.results[0].place_id}&key=${GLOBAL.MAPS_API_KEY}`
            ).then(
              lastRep => {
                createAlarm(lastRep.data?.result?.name ?? 'Unknown address',resp.data?.results[0]?.place_id);
              });
          });
      } else {
        createAlarm(locationAlarmName,placeIdAlarm);
      }
    };
  };

  const checkAlarams = () => {
    const countActiveAlarams = alarmRef.current.reduce((acc, current) => {
      return acc + (current.isActive ? 1 : 0);
    }, 0);

    if (countActiveAlarams === 0) {
      onStop();
    } else {
      onStart();
    }
  };

  useEffect(() => {
    if (alarmData.length > 0) {
      checkAlarams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmData]);

  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     console.log('Foucs in');
  //   });

  //   // Return the function to unsubscribe from the event so it gets removed on unmount
  //   return unsubscribe;
  // }, [navigation]);

 
  // const newMethod = async () => {
  //   const backgroundgranted = await PermissionsAndroid.request(
  //     PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  //     {
  //       title: 'Background Location Permission',
  //       message:
  //         'We need access to your location ' +
  //         'so you can get live quality updates.',
  //       buttonNeutral: 'Ask Me Later',
  //       buttonNegative: 'Cancel',
  //       buttonPositive: 'OK',
  //     },
  //   );
  //   if (backgroundgranted === PermissionsAndroid.RESULTS.GRANTED) {
  //     let locationSubscription = null;
  //     let locationTimeout = null;
  //     ReactNativeForegroundService.add_task(
  //       () => {
  //         // RNLocation.getLatestLocation().then(res => {
  //         //   console.log(res);
  //         // });
  //         RNLocation.requestPermission({
  //           ios: 'always',
  //           android: {
  //             detail: 'fine',
  //           },
  //         }).then(granted => {
  //           console.log('Location Permissions: ', granted);
  //           // if has permissions try to obtain location with RN location
  //           if (granted) {
  //             locationSubscription && locationSubscription();
  //             locationSubscription = RNLocation.subscribeToLocationUpdates(
  //               ([locations]) => {
  //                 locationSubscription();
  //                 locationTimeout && clearTimeout(locationTimeout);
  //                 console.log(1223, locations.latitude);
  //               },
  //             );
  //           } else {
  //             locationSubscription && locationSubscription();
  //             locationTimeout && clearTimeout(locationTimeout);
  //             console.log('no permissions to obtain location');
  //           }
  //         });
  //       },
  //       {
  //         delay: 12000,
  //         onLoop: true,
  //         taskId: 'taskid',
  //         onError: e => console.log('Error logging:', e),
  //       },
  //     );
  //     ReactNativeForegroundService.start({
  //       id: 'taskid',
  //       title: 'Alert Service',
  //       message: 'Your location is being used in background.',
  //     });
  //   }
  // };

  useEffect(() => {
    // BackgroundTimer.runBackgroundTimer(() => {
    // }, 30000);
    // return () => {
    //   BackgroundTimer.stopBackgroundTimer();
    // // };
    // onStart();
    RNLocation.configure({
      distanceFilter: 100, // Meters
      desiredAccuracy: {
        ios: 'best',
        android: 'balancedPowerAccuracy',
      },
      // Android only
      androidProvider: 'auto',
      interval: 5000, // Milliseconds
      fastestInterval: 10000, // Milliseconds
      maxWaitTime: 5000, // Milliseconds
      // iOS Only
      activityType: 'other',
      allowsBackgroundLocationUpdates: false,
      headingFilter: 1, // Degrees
      headingOrientation: 'portrait',
      pausesLocationUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
    });
    // newMethod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // requestBackgroundLocationPermission();
    const unsubscribe = navigation.addListener('focus', e => {
      console.log('refreshing');
      if (auth()?.currentUser?.uid) {
        // const allAlarms = [];
        firestore()
          .collection('Users')
          .doc(auth().currentUser.uid)
          .collection('Alarms')
          .onSnapshot(doc => {
            if (!doc) return;
            doc.docChanges().forEach(change => {
              // onStart();
              if (change.type === 'added') {
                setAlarmData(prev => {
                  return uniqBy(
                    [{ ...change.doc.data(), id: change.doc.id }, ...prev],
                    'id',
                  );
                });
                alarmRef.current = uniqBy(
                  [
                    { ...change.doc.data(), id: change.doc.id },
                    ...alarmRef.current,
                  ],
                  'id',
                );
              }
              if (change.type === 'modified') {
                setAlarmData(prev => {
                  return uniqBy(
                    prev.map(item => {
                      if (item.id === change.doc.id) {
                        return { ...item, ...change.doc.data() };
                      } else {
                        return item;
                      }
                    }),
                    'id',
                  );
                });
                alarmRef.current = uniqBy(
                  alarmRef.current.map(item => {
                    if (item.id === change.doc.id) {
                      return { ...item, ...change.doc.data() };
                    } else {
                      return item;
                    }
                  }),
                  'id',
                );
              }
              if (change.type === 'removed') {
                setAlarmData(prev => {
                  return uniqBy(
                    prev.filter(item => {
                      if (item.id === change.doc.id) {
                        return false;
                      }
                      return true;
                    }),
                    'id',
                  );
                });
                alarmRef.current = uniqBy(
                  alarmRef.current.filter(item => {
                    if (item.id === change.doc.id) {
                      return false;
                    }
                    return true;
                  }),
                  'id',
                );
              }
            });
          });
      }
    });
    return unsubscribe;
  }, [navigation]);

  // React.useEffect(() => {
  //   if (canStart) {
  //     // 👈 test if you can start otherwise nothing will happen
  //     start();
  //   }
  // }, [canStart]);

  const onCurrentPositionPress = () => {
    // Geolocation.requestAuthorization();
    Geolocation.getCurrentPosition(
      info => {
        if (info?.coords) {
          const { coords } = info;

          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      },
      err => {
        console.log(err?.message);
        Alert.alert(
          err?.message ? err?.message : 'Alert',
          'Please make sure that location is turned on an app have permission.',
        );
      },
    );
  };

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        // region={region}
        // initialRegion={{
        //   latitude: 37.78825,
        //   longitude: -122.4324,
        //   latitudeDelta: 0.0922,
        //   longitudeDelta: 0.0421,
        // }}
        onUserLocationChange={e => {
          // console.log(e.nativeEvent.coordinate);
          // performOperation(e.nativeEvent.coordinate);
        }}
        onPress={onMapPress}
        onPoiClick={onPoiClick}
        showsUserLocation
        showsMyLocationButton={false}
        userLocationUpdateInterval={15000}
        showsPointsOfInterest={false}
        showsCompass={false}
        // onRegionChangeComplete={setRegion}
        loadingEnabled>
        {marker?.coordinate && (
          <Marker
            draggable
            pinColor={colors.skyblue}
            coordinate={marker.coordinate}
            onPress={e => {
              onMapPress(e);
            }}
            onDragEnd={e => {
              onMapPress(e);
            }}
          />
        )}
        {alarmData?.map(item => {
          if (!item.distanceAlarm || !item.isActive) {
            return null;
          }
          // return null;
          return (
            <React.Fragment key={item.id}>
              <Circle
                center={{
                  latitude: item.coordinate.latitude,
                  longitude: item.coordinate.longitude,
                }}
                radius={item.distance * 1609.34}
                fillColor="rgba(0, 0, 255, 0.05)"
                strokeColor="rgba(100, 100, 100, 0.5)"
                zIndex={2}
                strokeWidth={1}
              />
              <Marker
                pinColor={colors.skyblue}
                coordinate={{
                  latitude: item.coordinate.latitude,
                  longitude: item.coordinate.longitude,
                }}
              />
            </React.Fragment>
          );
        })}
      </MapView>
      <TourGuideZone
        zone={1}
        text={'A react-native-copilot remastered! 🎉'}
        borderRadius={16}
      >
      <SearchBar
        onPress={(data, details = null) => {
          // 'details' is provided when fetchDetails = true
          console.log("We are here");
          const { lat: latitude, lng: longitude } = details.geometry.location;
          setLocationAlarm(details.name);
          setLocationPlaceIdAlarm(data.place_id);
          // setRegion(prev => ({...prev, latitude, longitude}));
          mapRef.current.animateToRegion({
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          setMarker({
            coordinate: { latitude, longitude },
          });
          rawSheetRef.current.open();
        }}
      />
      </TourGuideZone>
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 60,
          right: 10,
          backgroundColor: colors.white,
          padding: 15,
          borderRadius: 50,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.34,
          shadowRadius: 6.27,
          elevation: 10,
        }}
        onPress={onCurrentPositionPress}>
        <MaterialIcons name="my-location" size={25} color={colors.gray} />
      </TouchableOpacity>
      {/* <View style={{position: 'absolute', top: 50}}>
        <Text
          style={{
            fontSize: 20,
            color: 'red',
          }}>{`${currentLocation?.latitude}-${currentLocation?.longitude}`}</Text>
      </View> */}
      <View>
        {/* <SearchBar /> */}
        <RBSheet
          animationType="slide"
          ref={rawSheetRef}
          height={440}
          openDuration={250}
          closeOnDragDown={true}
          customStyles={{
            container: {
              padding: 16,
            },
            wrapper: {
              backgroundColor: "transparent"
            },
          }}>
          <ScrollView>
            <DistanceAlarmCard
              distanceCheckbox={distanceCheckbox}
              setDistanceCheckbox={setDistanceCheckbox}
              selectDistance={selectDistance}
              setSelectDistance={setSelectDistance}
            />
            <TimeAlarmCard
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              endTime={endTime}
              setEndTime={setEndTime}
              timeCheckbox={timeCheckbox}
              setTimeCheckbox={setTimeCheckbox}
            />
            <NotesCard notes={notes} setNotes={setNotes}>

            </NotesCard>
            {/* <NotificationViaCard
            notificationVia={notificationVia}
            setNotificationVia={setNotificationVia}
          /> */}
            <SubmitButton onPress={onSubmit} />
          </ScrollView>
        </RBSheet>
      </View>
      <Spinner show={loading} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {},
  text: {
    fontSize: 22,
    color: '#fff',
    position: 'relative',
    left: -5,
  },
});

export default Home;
