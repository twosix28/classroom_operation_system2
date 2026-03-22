'use client';

import { FLOORS, getRoomsForFloor } from '../utils/supabase';

export default function FloorRoomSelector({ selectedFloor, selectedRoom, onFloorChange, onRoomChange }) {
  const floorLabel = (floor) => floor === 0 ? '외부 시설' : `${floor}층`;
  const roomLabel = (floor, room) => floor === 0 ? room : `${room}호`;

  return (
    <div className="space-y-3">
      {/* Floor selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">층 선택</label>
        <div className="flex gap-2">
          {FLOORS.map((floor) => (
            <button
              type="button"
              key={floor}
              onClick={() => {
                onFloorChange(floor);
                onRoomChange('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all border ${
                selectedFloor === floor
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {floorLabel(floor)}
            </button>
          ))}
        </div>
      </div>

      {/* Room selection */}
      {(selectedFloor !== '' && selectedFloor !== undefined && selectedFloor !== null) && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">강의실 선택</label>
          <div className="grid grid-cols-5 gap-1.5">
            {getRoomsForFloor(selectedFloor).map((room) => (
              <button
                type="button"
                key={room}
                onClick={() => onRoomChange(room)}
                className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                  selectedRoom === room
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {roomLabel(selectedFloor, room)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
