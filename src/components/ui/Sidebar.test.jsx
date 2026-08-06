// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import Sidebar from './Sidebar'
import useHouseStore from '../../store/useHouseStore'

const LIVING_ROOM_ID = 1
const BEDROOM_ID = 2

const initialState = useHouseStore.getState()

beforeEach(() => {
  useHouseStore.setState(initialState, true)
})

function getRoom(id) {
  return useHouseStore.getState().rooms.find((r) => r.id === id)
}

describe('room list and selection', () => {
  it('shows a placeholder and no editor when nothing is selected', () => {
    render(<Sidebar />)
    expect(screen.getByText('Living Room')).toBeInTheDocument()
    expect(screen.getByText('Bedroom')).toBeInTheDocument()
    expect(screen.getByText('Click a room to edit it')).toBeInTheDocument()
    expect(screen.queryByText(/^Edit:/)).not.toBeInTheDocument()
  })

  it('clicking a room in the list selects it and opens its editor', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Living Room'))

    expect(useHouseStore.getState().selectedRoomId).toBe(LIVING_ROOM_ID)
    expect(screen.getByText('Edit: Living Room')).toBeInTheDocument()
  })
})

describe('editing a selected room', () => {
  beforeEach(() => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
  })

  it('renaming the room updates the store', () => {
    render(<Sidebar />)
    const nameInput = screen.getByDisplayValue('Living Room')
    fireEvent.change(nameInput, { target: { value: 'Great Room' } })

    expect(getRoom(LIVING_ROOM_ID).name).toBe('Great Room')
  })

  it('changing width/height updates the room and is clamped to MIN_ROOM_SIZE', () => {
    render(<Sidebar />)
    const widthInput = screen.getByDisplayValue(12)
    fireEvent.change(widthInput, { target: { value: '0' } })

    expect(getRoom(LIVING_ROOM_ID).width).toBe(1) // MIN_ROOM_SIZE
  })

  it('toggling a wall off removes it from the doorway/window wall choices', () => {
    render(<Sidebar />)
    const topWallButton = screen.getByRole('button', { name: /Top wall/ })
    expect(topWallButton.textContent).toContain('✓')

    fireEvent.click(topWallButton)

    expect(getRoom(LIVING_ROOM_ID).walls.top).toBe(false)
    const doorwaysLabel = screen.getByText('Doorways')
    const doorwaysSection = within(doorwaysLabel.parentElement)
    const wallSelect = doorwaysSection.getByRole('combobox')
    const optionValues = within(wallSelect)
      .getAllByRole('option')
      .map((o) => o.value)
    expect(optionValues).not.toContain('top')
  })

  it('deleting the room clears it from the list and the selection', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete room' }))

    expect(getRoom(LIVING_ROOM_ID)).toBeUndefined()
    expect(useHouseStore.getState().selectedRoomId).toBeNull()
    expect(screen.queryByText('Living Room')).not.toBeInTheDocument()
  })
})

describe('doorways', () => {
  beforeEach(() => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
  })

  it('adding a door shows it with a position slider, and removing it clears it', () => {
    render(<Sidebar />)
    const doorwaysSection = within(screen.getByText('Doorways').parentElement)
    fireEvent.click(doorwaysSection.getByRole('button', { name: '+ Add' }))

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(1)
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('End')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove doorways' }))
    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(0)
  })

  it("adding a door on Living Room's shared wall mirrors one into Bedroom", () => {
    render(<Sidebar />)
    const doorwaysSection = within(screen.getByText('Doorways').parentElement)
    fireEvent.change(doorwaysSection.getByRole('combobox'), { target: { value: 'right' } })
    fireEvent.click(doorwaysSection.getByRole('button', { name: '+ Add' }))

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(1)
    expect(getRoom(BEDROOM_ID).doors).toHaveLength(1)
  })
})

describe('adding and removing rooms', () => {
  it('"+ Add room" appends a new room to the list', () => {
    render(<Sidebar />)
    const before = useHouseStore.getState().rooms.length

    fireEvent.click(screen.getByRole('button', { name: '+ Add room' }))

    expect(useHouseStore.getState().rooms).toHaveLength(before + 1)
  })

  it('"+ Add floor (no walls)" appends a room with every wall off', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add floor (no walls)' }))

    const rooms = useHouseStore.getState().rooms
    const floor = rooms[rooms.length - 1]
    expect(Object.values(floor.walls).every((present) => present === false)).toBe(true)
  })
})
