import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
export default function TicketPanel({ onSubmitTicket }: { onSubmitTicket?: (data: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState("General");
  const [showSubjectList, setShowSubjectList] = useState(false);
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const subjects = ["General", "Plumbing", "Electrical", "Housekeeping", "Other"];

  const resetForm = () => {
    setSubject("General");
    setDescription("");
    setAttachment(null);
    setShowSubjectList(false);
  };

  const submit = () => {
    const payload = { subject, description, attachment, createdAt: new Date().toISOString() };
    if (onSubmitTicket) onSubmitTicket(payload);
    // placeholder: show confirmation UI / toast if you have one
    resetForm();
    setExpanded(false);
  };

  const fakeUpload = () => {
    // TODO: replace with ImagePicker / DocumentPicker
    setAttachment("uploaded-file-placeholder.png");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="px-4 -mt-2 mb-6">
        {/* Raise New Ticket pill */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setExpanded((s) => !s)}
          className="bg-[#2F3CFF] rounded-full py-4 items-center justify-center"
          style={{ shadowColor: "#2F3CFF", shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}
        >
          <View className="flex-row items-center">
            <Text className="text-white font-semibold text-3xl mr-2">
              {expanded ? "Raise New Ticket" : "Raise New Ticket"}
            </Text>
            <Ionicons name={expanded ? "chevron-down" : "add"} size={30} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Form appears when expanded */}
        {expanded && (
          <View className="bg-white border border-gray-200 rounded-xl mt-4 overflow-hidden">
            {/* Subject (select) */}
            <TouchableOpacity
              onPress={() => setShowSubjectList((s) => !s)}
              className="border-b border-gray-100 px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-gray-500">Subject / Issue Type</Text>
              <View className="flex-row items-center">
                <Text className="text-gray-700 mr-2">{subject}</Text>
                <Ionicons name="chevron-down" size={18} color="gray" />
              </View>
            </TouchableOpacity>

            {/* Sliding subject list */}
            {showSubjectList && (
              <View className="px-4 py-2 border-b border-gray-100 bg-white">
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setSubject(s);
                      setShowSubjectList(false);
                    }}
                    className="py-2"
                  >
                    <Text className="text-gray-700">{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Description */}
            <View className="px-4 py-3 border-b border-gray-100">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                multiline
                textAlignVertical="top"
                className="h-24 text-gray-700"
                style={{
                  paddingTop: Platform.OS === "android" ? 6 : 10,
                }}
              />
            </View>

            {/* Upload / Submit area */}
            <View className="px-4 py-3">
              <TouchableOpacity
                onPress={fakeUpload}
                className="flex-row items-center px-3 py-2 rounded-lg border border-gray-200"
              >
                <Ionicons name="attach-outline" size={18} color="#7F7F7F" />
                <Text className="ml-3 text-gray-600">Upload image or attachment</Text>
              </TouchableOpacity>

              {/* show small preview when attached (placeholder) */}
              {attachment && (
                <View className="mt-3 flex-row items-center">
                  {/* placeholder box */}
                  <View className="w-12 h-12 bg-gray-100 rounded-md items-center justify-center mr-3">
                    <Ionicons name="image-outline" size={22} color="#8C8C8C" />
                  </View>
                  <Text className="text-gray-700">{attachment}</Text>
                </View>
              )}

              {/* Submit button centered below */}
              <View className="items-center mt-4">
                <TouchableOpacity
                  onPress={submit}
                  disabled={!description.trim()}
                  className={`px-6 py-2 rounded-full ${description.trim() ? "bg-[#6D7BFF]" : "bg-gray-200"}`}
                >
                  <Text className={`text-white font-semibold ${description.trim() ? "" : "text-gray-400"}`}>
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Tap existing ticket pill */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            /* It can navigate to Tickets list or open a modal */
          }}
          className="bg-[#2F3CFF] rounded-full py-4 items-center justify-center mt-5"
          style={{ shadowColor: "#2F3CFF", shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 }}
        >
          <Text className="text-white font-semibold text-3xl">Tap an existing ticket</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
